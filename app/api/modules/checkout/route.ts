import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';
import { isOrgAdminRole } from '@/lib/roles';
import { isModuleActiveForUser, getOrCreateStripeCustomerId } from '@/lib/module-access';
import { MODULE_CODES, getModuleByCode, ModuleCode } from '@/lib/modules';
import {
  buildModuleCheckoutMetadata,
  getAppBaseUrl,
  getStripe,
  isStripeConfigured,
  moduleSubscriptionLineItem,
  MODULE_SUBSCRIPTION_TRIAL_DAYS,
} from '@/lib/stripe';
import { validateRequest } from '@/lib/validation';

const checkoutSchema = z.object({
  module_code: z.enum([
    MODULE_CODES.PIANIFICAZIONE_INTERVENTI,
    MODULE_CODES.ASSEGNAZIONE_LAVORI,
    MODULE_CODES.NOTIFICHE_SCADENZE,
  ]),
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

    const moduleCode = validation.data.module_code as ModuleCode;
    const modulo = getModuleByCode(moduleCode);
    if (!modulo) {
      return NextResponse.json({ error: 'Modulo non trovato' }, { status: 404 });
    }

    const alreadyActive = await isModuleActiveForUser(userId, orgId, moduleCode);
    if (alreadyActive) {
      return NextResponse.json({ error: 'Il modulo è già attivo' }, { status: 400 });
    }

    const { customerId } = await getOrCreateStripeCustomerId(userId, orgId);
    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [moduleSubscriptionLineItem(modulo.nome)],
      subscription_data: {
        trial_period_days: MODULE_SUBSCRIPTION_TRIAL_DAYS,
        metadata: buildModuleCheckoutMetadata({ userId, orgId, moduleCode }),
      },
      metadata: buildModuleCheckoutMetadata({ userId, orgId, moduleCode }),
      success_url: `${baseUrl}${modulo.href}?checkout=success`,
      cancel_url: `${baseUrl}${modulo.href}?checkout=cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Impossibile avviare il pagamento' }, { status: 500 });
    }

    return NextResponse.json({ data: { url: session.url } });
  } catch (error) {
    console.error('POST /api/modules/checkout error:', error);
    return NextResponse.json({ error: 'Errore nell\'avvio del pagamento' }, { status: 500 });
  }
}
