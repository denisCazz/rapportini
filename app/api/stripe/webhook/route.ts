import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
} from '@/lib/module-stripe-webhook';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe non configurato' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET mancante');
    return NextResponse.json({ error: 'Webhook non configurato' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Firma mancante' }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe] Verifica firma webhook fallita:', error);
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          await handleCheckoutSessionCompleted(session);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`[stripe] Errore gestione evento ${event.type}:`, error);
    return NextResponse.json({ error: 'Errore elaborazione webhook' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
