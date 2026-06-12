import Stripe from 'stripe';
import {
  syncModuleSubscription,
  syncUserBundleSubscription,
} from '@/lib/module-access';
import {
  isStripeSubscriptionGrantedAccess,
  subscriptionStatusForStorage,
} from '@/lib/subscription-status';
import { prisma } from '@/lib/db';
import { syncCatBundleSubscription } from '@/lib/cat-subscription';
import { getModuleByCode, ModuleCode } from '@/lib/modules';

function getMetadataString(
  metadata: Stripe.Metadata | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export type CheckoutSyncResult = { ok: true } | { ok: false; error: string };

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<CheckoutSyncResult> {
  const subscriptionType = getMetadataString(session.metadata, 'subscription_type');

  if (subscriptionType === 'cat_bundle') {
    return handleCatBundleCheckoutCompleted(session);
  }

  if (subscriptionType === 'user_bundle') {
    return handleUserBundleCheckoutCompleted(session);
  }

  const userId = getMetadataString(session.metadata, 'user_id');
  const orgId = getMetadataString(session.metadata, 'org_id');
  const moduleCode = getMetadataString(session.metadata, 'module_code') as ModuleCode | null;

  if (!userId || !orgId || !moduleCode || !getModuleByCode(moduleCode)) {
    const error = 'Metadata checkout mancante o modulo non valido';
    console.error('[stripe] checkout.session.completed:', error, { userId, orgId, moduleCode });
    return { ok: false, error };
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[stripe] checkout.session.completed: subscription id mancante');
    return { ok: false, error: 'Abbonamento Stripe non trovato nella sessione' };
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncModuleSubscription({
    userId,
    orgId,
    moduleCode,
    subscriptionId: subscription.id,
    subscriptionStatus: subscriptionStatusForStorage(subscription),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    attivo: isStripeSubscriptionGrantedAccess(subscription),
  });

  return { ok: true };
}

async function handleUserBundleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<CheckoutSyncResult> {
  const userId = getMetadataString(session.metadata, 'user_id');
  const orgId = getMetadataString(session.metadata, 'org_id');

  if (!userId || !orgId) {
    console.error('[stripe] user_bundle checkout: metadata mancante');
    return { ok: false, error: 'Metadata bundle mancante' };
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[stripe] user_bundle checkout: subscription id mancante');
    return { ok: false, error: 'Abbonamento bundle non trovato' };
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncUserBundleSubscription({
    userId,
    orgId,
    subscriptionId: subscription.id,
    subscriptionStatus: subscriptionStatusForStorage(subscription),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    attivo: isStripeSubscriptionGrantedAccess(subscription),
  });

  return { ok: true };
}

async function handleCatBundleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<CheckoutSyncResult> {
  const orgId = getMetadataString(session.metadata, 'org_id');
  const operatorCountRaw = getMetadataString(session.metadata, 'operator_count');
  const operatorCount = operatorCountRaw ? parseInt(operatorCountRaw, 10) : 0;

  if (!orgId) {
    console.error('[stripe] cat_bundle checkout: org_id mancante');
    return { ok: false, error: 'Metadata CAT mancante' };
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[stripe] cat_bundle checkout: subscription id mancante');
    return { ok: false, error: 'Abbonamento CAT non trovato' };
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await syncCatBundleSubscription({
    orgId,
    subscriptionId: subscription.id,
    subscriptionStatus: subscriptionStatusForStorage(subscription),
    operatorSlots: Number.isFinite(operatorCount) ? operatorCount : 0,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  });

  return { ok: true };
}

async function syncSubscriptionByIdLookup(subscription: Stripe.Subscription): Promise<boolean> {
  const storedStatus = subscriptionStatusForStorage(subscription);
  const attivo = isStripeSubscriptionGrantedAccess(subscription);
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  const bundleUser = await prisma.utenti.findFirst({
    where: { stripe_user_bundle_subscription_id: subscription.id },
    select: { id: true, org_id: true },
  });

  if (bundleUser) {
    await syncUserBundleSubscription({
      userId: bundleUser.id,
      orgId: bundleUser.org_id,
      subscriptionId: subscription.id,
      subscriptionStatus: storedStatus,
      trialEndsAt,
      attivo,
    });
    return true;
  }

  const moduleRow = await prisma.utenteModuli.findFirst({
    where: { stripe_subscription_id: subscription.id },
    include: { moduli: { select: { code: true } } },
  });

  if (moduleRow) {
    await syncModuleSubscription({
      userId: moduleRow.utente_id,
      orgId: moduleRow.org_id,
      moduleCode: moduleRow.moduli.code as ModuleCode,
      subscriptionId: subscription.id,
      subscriptionStatus: storedStatus,
      trialEndsAt,
      attivo,
    });
    return true;
  }

  const catOrg = await prisma.organizzazioni.findFirst({
    where: { stripe_subscription_id: subscription.id },
    select: { org_id: true },
  });

  if (catOrg) {
    await syncCatBundleSubscription({
      orgId: catOrg.org_id,
      subscriptionId: subscription.id,
      subscriptionStatus: storedStatus,
      operatorSlots: 0,
      trialEndsAt,
    });
    return true;
  }

  return false;
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const subscriptionType = getMetadataString(subscription.metadata, 'subscription_type');
  const storedStatus = subscriptionStatusForStorage(subscription);
  const attivo = isStripeSubscriptionGrantedAccess(subscription);
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  if (subscriptionType === 'cat_bundle') {
    const orgId = getMetadataString(subscription.metadata, 'org_id');
    const operatorCountRaw = getMetadataString(subscription.metadata, 'operator_count');
    const operatorCount = operatorCountRaw ? parseInt(operatorCountRaw, 10) : 0;

    if (!orgId) {
      await syncSubscriptionByIdLookup(subscription);
      return;
    }

    await syncCatBundleSubscription({
      orgId,
      subscriptionId: subscription.id,
      subscriptionStatus: storedStatus,
      operatorSlots: Number.isFinite(operatorCount) ? operatorCount : 0,
      trialEndsAt,
    });
    return;
  }

  if (subscriptionType === 'user_bundle') {
    const userId = getMetadataString(subscription.metadata, 'user_id');
    const orgId = getMetadataString(subscription.metadata, 'org_id');
    if (!userId || !orgId) {
      await syncSubscriptionByIdLookup(subscription);
      return;
    }

    await syncUserBundleSubscription({
      userId,
      orgId,
      subscriptionId: subscription.id,
      subscriptionStatus: storedStatus,
      trialEndsAt,
      attivo,
    });
    return;
  }

  const userId = getMetadataString(subscription.metadata, 'user_id');
  const orgId = getMetadataString(subscription.metadata, 'org_id');
  const moduleCode = getMetadataString(subscription.metadata, 'module_code') as ModuleCode | null;

  if (!userId || !orgId || !moduleCode || !getModuleByCode(moduleCode)) {
    await syncSubscriptionByIdLookup(subscription);
    return;
  }

  await syncModuleSubscription({
    userId,
    orgId,
    moduleCode,
    subscriptionId: subscription.id,
    subscriptionStatus: storedStatus,
    trialEndsAt,
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
