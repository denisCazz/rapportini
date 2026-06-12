import { NextRequest, NextResponse } from 'next/server';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import {
  getCatBundleCheckoutPrice,
  getCatSubscription,
  getOrCreateCatStripeCustomer,
} from '@/lib/cat-subscription';
import { isCatAdmin } from '@/lib/roles';
import {
  buildCatBundleCheckoutMetadata,
  catBundleSubscriptionLineItems,
  getAppBaseUrl,
  getStripe,
  isStripeConfigured,
  MODULE_SUBSCRIPTION_TRIAL_DAYS,
} from '@/lib/stripe';
import { CAT_STATO } from '@/lib/cat-status';

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    const userId = getUserIdFromRequest(request);

    if (!isCatAdmin(userRole) || !userId) {
      return NextResponse.json({ error: 'Accesso riservato agli amministratori CAT' }, { status: 403 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Pagamenti non ancora configurati. Contatta il supporto.' },
        { status: 503 }
      );
    }

    const orgId = getOrgIdFromRequest(request);
    const org = await getCatSubscription(orgId);

    if (!org) {
      return NextResponse.json({ error: 'CAT non trovato' }, { status: 404 });
    }

    if (org.stato !== CAT_STATO.ATTIVO) {
      return NextResponse.json(
        { error: 'Il CAT deve essere approvato prima di sottoscrivere il pacchetto moduli.' },
        { status: 403 }
      );
    }

    const { operatorCount, monthlyPriceEur } = await getCatBundleCheckoutPrice(orgId);

    if (operatorCount < 1) {
      return NextResponse.json(
        { error: 'Aggiungi almeno un operatore prima di sottoscrivere il pacchetto.' },
        { status: 400 }
      );
    }

    const { customerId } = await getOrCreateCatStripeCustomer(orgId, userId);
    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: await catBundleSubscriptionLineItems({ operatorCount }),
      subscription_data: {
        trial_period_days: MODULE_SUBSCRIPTION_TRIAL_DAYS,
        metadata: buildCatBundleCheckoutMetadata({
          orgId,
          adminUserId: userId,
          operatorCount,
        }),
      },
      metadata: buildCatBundleCheckoutMetadata({
        orgId,
        adminUserId: userId,
        operatorCount,
      }),
      success_url: `${baseUrl}/admin/cat-moduli?checkout=success`,
      cancel_url: `${baseUrl}/admin/cat-moduli?checkout=cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Impossibile avviare il pagamento' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        url: session.url,
        operatorCount,
        monthlyPriceEur,
      },
    });
  } catch (error) {
    console.error('POST /api/cat/modules/checkout error:', error);
    return NextResponse.json({ error: 'Errore nell\'avvio del pagamento' }, { status: 500 });
  }
}
