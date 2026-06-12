import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { handleCheckoutSessionCompleted } from '@/lib/module-stripe-webhook';
import { validateRequest } from '@/lib/validation';

const confirmSchema = z.object({
  session_id: z.string().min(1),
});

/**
 * Conferma checkout al ritorno da Stripe (fallback se webhook non ancora ricevuto).
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) return tenant.response;

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe non configurato' }, { status: 503 });
    }

    const body = await request.json();
    const validation = validateRequest(confirmSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(validation.data.session_id);

    if (session.mode !== 'subscription') {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 400 });
    }

    if (session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Pagamento non completato. Completa il checkout su Stripe.' },
        { status: 400 }
      );
    }

    const metaUserId = session.metadata?.user_id;
    const metaAdminId = session.metadata?.admin_user_id;
    const { id: userId } = tenant.user;

    if (metaUserId !== userId && metaAdminId !== userId) {
      return NextResponse.json({ error: 'Sessione non autorizzata' }, { status: 403 });
    }

    await handleCheckoutSessionCompleted(session);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('POST /api/modules/checkout/confirm error:', error);
    return NextResponse.json({ error: 'Errore conferma pagamento' }, { status: 500 });
  }
}
