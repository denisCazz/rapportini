import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';
import { isOrgAdminRole } from '@/lib/roles';
import { isModuleActiveForUser, getOrCreateStripeCustomerId } from '@/lib/module-access';
import { ALL_MODULE_CODES, getModuleByCode, ModuleCode } from '@/lib/modules';
import {
  buildModuleCheckoutMetadata,
  buildUserBundleCheckoutMetadata,
  checkoutCancelUrl,
  checkoutSuccessUrl,
  getStripe,
  isStripeConfigured,
  moduleSubscriptionLineItem,
  resolveCheckoutBaseUrl,
  subscriptionCheckoutDefaults,
  userBundleSubscriptionLineItem,
  MODULE_SUBSCRIPTION_TRIAL_DAYS,
} from '@/lib/stripe';
import { validateRequest } from '@/lib/validation';

const checkoutSchema = z.object({
  target: z.enum(['module', 'bundle']).default('module'),
  module_code: z.enum(ALL_MODULE_CODES as [ModuleCode, ...ModuleCode[]]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) {
      return tenant.response;
    }

    const { id: userId, org_id: orgId, ruolo: userRole } = tenant.user;
    if (isOrgAdminRole(userRole)) {
      return NextResponse.json(
        { error: 'Gli amministratori gestiscono i moduli tramite il pannello CAT, non tramite checkout personale' },
        { status: 400 }
      );
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Pagamenti non ancora configurati. Contatta il supporto.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(checkoutSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { target } = validation.data;
    const { customerId } = await getOrCreateStripeCustomerId(userId, orgId);
    const stripe = getStripe();
    const checkoutDefaults = subscriptionCheckoutDefaults();
    const checkoutBase = resolveCheckoutBaseUrl(request);

    if (target === 'bundle') {
      const session = await stripe.checkout.sessions.create({
        ...checkoutDefaults,
        mode: 'subscription',
        customer: customerId,
        line_items: [await userBundleSubscriptionLineItem()],
        subscription_data: {
          trial_period_days: MODULE_SUBSCRIPTION_TRIAL_DAYS,
          metadata: buildUserBundleCheckoutMetadata({ userId, orgId }),
        },
        metadata: buildUserBundleCheckoutMetadata({ userId, orgId }),
        success_url: checkoutSuccessUrl('/utente/abbonamento', checkoutBase),
        cancel_url: checkoutCancelUrl('/moduli/pianificazione-interventi', checkoutBase),
        allow_promotion_codes: true,
      });

      if (!session.url) {
        return NextResponse.json({ error: 'Impossibile avviare il pagamento' }, { status: 500 });
      }

      return NextResponse.json({ data: { url: session.url, target: 'bundle' } });
    }

    const moduleCode = validation.data.module_code as ModuleCode | undefined;
    if (!moduleCode) {
      return NextResponse.json({ error: 'module_code obbligatorio per attivazione singolo modulo' }, { status: 400 });
    }

    const modulo = getModuleByCode(moduleCode);
    if (!modulo) {
      return NextResponse.json({ error: 'Modulo non trovato' }, { status: 404 });
    }

    const alreadyActive = await isModuleActiveForUser(userId, orgId, moduleCode);
    if (alreadyActive) {
      return NextResponse.json({ error: 'Il modulo è già attivo' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      ...checkoutDefaults,
      mode: 'subscription',
      customer: customerId,
      line_items: [await moduleSubscriptionLineItem(moduleCode, modulo.nome)],
      subscription_data: {
        trial_period_days: MODULE_SUBSCRIPTION_TRIAL_DAYS,
        metadata: buildModuleCheckoutMetadata({ userId, orgId, moduleCode }),
      },
      metadata: buildModuleCheckoutMetadata({ userId, orgId, moduleCode }),
      success_url: checkoutSuccessUrl(modulo.href, checkoutBase),
      cancel_url: checkoutCancelUrl(modulo.href, checkoutBase),
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Impossibile avviare il pagamento' }, { status: 500 });
    }

    return NextResponse.json({ data: { url: session.url, target: 'module' } });
  } catch (error) {
    console.error('POST /api/modules/checkout error:', error);
    return NextResponse.json({ error: 'Errore nell\'avvio del pagamento' }, { status: 500 });
  }
}
