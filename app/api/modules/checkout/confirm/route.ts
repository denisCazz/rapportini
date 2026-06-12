import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';
import { getOrCreateStripeCustomerId } from '@/lib/module-access';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { handleCheckoutSessionCompleted } from '@/lib/module-stripe-webhook';
import { validateRequest } from '@/lib/validation';

const confirmSchema = z.object({
  session_id: z.string().min(1).optional(),
});

async function findLatestCompletedSession(
  stripe: Stripe,
  customerId: string,
  userId: string
): Promise<Stripe.Checkout.Session | null> {
  const sessions = await stripe.checkout.sessions.list({
    customer: customerId,
    limit: 10,
    status: 'complete',
  });

  return (
    sessions.data.find(
      (s) =>
        s.mode === 'subscription' &&
        (s.metadata?.user_id === userId || s.metadata?.admin_user_id === userId)
    ) ?? null
  );
}

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

    const body = await request.json().catch(() => ({}));
    const validation = validateRequest(confirmSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { id: userId, org_id: orgId } = tenant.user;
    const stripe = getStripe();

    let session: Stripe.Checkout.Session | null = null;

    if (validation.data.session_id) {
      session = await stripe.checkout.sessions.retrieve(validation.data.session_id, {
        expand: ['subscription'],
      });
    } else {
      const { customerId } = await getOrCreateStripeCustomerId(userId, orgId);
      session = await findLatestCompletedSession(stripe, customerId, userId);
      if (!session) {
        return NextResponse.json(
          {
            error:
              'Sessione non trovata. In locale imposta NEXT_PUBLIC_APP_URL=http://localhost:3000 e riprova il checkout.',
          },
          { status: 404 }
        );
      }
    }

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

    if (metaUserId !== userId && metaAdminId !== userId) {
      return NextResponse.json({ error: 'Sessione non autorizzata' }, { status: 403 });
    }

    const result = await handleCheckoutSessionCompleted(session);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: { success: true, sessionId: session.id } });
  } catch (error) {
    console.error('POST /api/modules/checkout/confirm error:', error);
    return NextResponse.json({ error: 'Errore conferma pagamento' }, { status: 500 });
  }
}
