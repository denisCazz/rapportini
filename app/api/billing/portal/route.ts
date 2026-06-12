import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateStripeCustomerId, getUserBillingSummary } from '@/lib/module-access';
import { getOrCreateCatStripeCustomer } from '@/lib/cat-subscription';
import { isCatAdmin, isOrgAdminRole } from '@/lib/roles';
import { getAppBaseUrl, getStripe, isStripeConfigured } from '@/lib/stripe';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) {
      return tenant.response;
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Pagamenti non configurati' }, { status: 503 });
    }

    const { id: userId, org_id: orgId, ruolo } = tenant.user;
    const body = await request.json().catch(() => ({}));
    const returnPath =
      typeof body?.returnPath === 'string' && body.returnPath.startsWith('/')
        ? body.returnPath
        : '/utente/abbonamento';

    let customerId: string | null = null;

    if (isCatAdmin(ruolo)) {
      const catCustomer = await getOrCreateCatStripeCustomer(orgId, userId);
      customerId = catCustomer.customerId;
    } else {
      const userCustomer = await getOrCreateStripeCustomerId(userId, orgId);
      customerId = userCustomer.customerId;
    }

    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}${returnPath}`,
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (error) {
    console.error('POST /api/billing/portal error:', error);
    return NextResponse.json({ error: 'Impossibile aprire il portale di fatturazione' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) {
      return tenant.response;
    }

    const { id: userId, org_id: orgId } = tenant.user;
    const summary = await getUserBillingSummary(userId, orgId);

    return NextResponse.json({
      data: summary,
      stripeEnabled: isStripeConfigured(),
    });
  } catch (error) {
    console.error('GET /api/billing/portal error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento abbonamento' }, { status: 500 });
  }
}
