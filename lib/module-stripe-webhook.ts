import Stripe from 'stripe';
import {
  syncModuleSubscription,
  syncUserBundleSubscription,
} from '@/lib/module-access';
import { isSubscriptionStatusActive } from '@/lib/subscription-status';
import { syncCatBundleSubscription } from '@/lib/cat-subscription';
import { getModuleByCode, ModuleCode } from '@/lib/modules';

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
  const subscriptionType = getMetadataString(session.metadata, 'subscription_type');

  if (subscriptionType === 'cat_bundle') {
    await handleCatBundleCheckoutCompleted(session);
    return;
  }

  if (subscriptionType === 'user_bundle') {
    await handleUserBundleCheckoutCompleted(session);
    return;
  }

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

async function handleUserBundleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = getMetadataString(session.metadata, 'user_id');
  const orgId = getMetadataString(session.metadata, 'org_id');

  if (!userId || !orgId) {
    console.error('[stripe] user_bundle checkout: metadata mancante');
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[stripe] user_bundle checkout: subscription id mancante');
    return;
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncUserBundleSubscription({
    userId,
    orgId,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  });
}

async function handleCatBundleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orgId = getMetadataString(session.metadata, 'org_id');
  const operatorCountRaw = getMetadataString(session.metadata, 'operator_count');
  const operatorCount = operatorCountRaw ? parseInt(operatorCountRaw, 10) : 0;

  if (!orgId) {
    console.error('[stripe] cat_bundle checkout: org_id mancante');
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[stripe] cat_bundle checkout: subscription id mancante');
    return;
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncCatBundleSubscription({
    orgId,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    operatorSlots: Number.isFinite(operatorCount) ? operatorCount : 0,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionType = getMetadataString(subscription.metadata, 'subscription_type');

  if (subscriptionType === 'cat_bundle') {
    const orgId = getMetadataString(subscription.metadata, 'org_id');
    const operatorCountRaw = getMetadataString(subscription.metadata, 'operator_count');
    const operatorCount = operatorCountRaw ? parseInt(operatorCountRaw, 10) : 0;

    if (!orgId) return;

    await syncCatBundleSubscription({
      orgId,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      operatorSlots: Number.isFinite(operatorCount) ? operatorCount : 0,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    });
    return;
  }

  if (subscriptionType === 'user_bundle') {
    const userId = getMetadataString(subscription.metadata, 'user_id');
    const orgId = getMetadataString(subscription.metadata, 'org_id');
    if (!userId || !orgId) return;

    await syncUserBundleSubscription({
      userId,
      orgId,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    });
    return;
  }

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

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdated(subscription);
}
