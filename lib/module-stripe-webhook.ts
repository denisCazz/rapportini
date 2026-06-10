import Stripe from 'stripe';
import { syncModuleSubscription } from '@/lib/module-access';
import { getModuleByCode, ModuleCode } from '@/lib/modules';
import { isSubscriptionStatusActive } from '@/lib/module-access';

function getMetadataString(
  metadata: Stripe.Metadata | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = getMetadataString(session.metadata, 'user_id');
  const orgId = getMetadataString(session.metadata, 'org_id');
  const moduleCode = getMetadataString(session.metadata, 'module_code') as ModuleCode | null;

  if (!userId || !orgId || !moduleCode || !getModuleByCode(moduleCode)) {
    console.error('[stripe] checkout.session.completed: metadata mancante o modulo invalido', {
      userId,
      orgId,
      moduleCode,
    });
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[stripe] checkout.session.completed: subscription id mancante');
    return;
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncModuleSubscription({
    userId,
    orgId,
    moduleCode,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    attivo: isSubscriptionStatusActive(subscription.status),
  });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = getMetadataString(subscription.metadata, 'user_id');
  const orgId = getMetadataString(subscription.metadata, 'org_id');
  const moduleCode = getMetadataString(subscription.metadata, 'module_code') as ModuleCode | null;

  if (!userId || !orgId || !moduleCode || !getModuleByCode(moduleCode)) {
    return;
  }

  const attivo = isSubscriptionStatusActive(subscription.status);

  await syncModuleSubscription({
    userId,
    orgId,
    moduleCode,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    attivo,
  });
}
