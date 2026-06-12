import { prisma } from '@/lib/db';
import { ALL_MODULE_CODES, ModuleCode } from '@/lib/modules';
import {
  isStripeSubscriptionGrantedAccess,
  isSubscriptionStatusActive,
  subscriptionStatusForStorage,
} from '@/lib/subscription-status';
import { isStripeConfigured } from '@/lib/stripe';

export { isSubscriptionStatusActive } from '@/lib/subscription-status';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active']);

export async function getActiveModuleCodesForUser(
  userId: string,
  orgId: string
): Promise<ModuleCode[]> {
  const utente = await prisma.utenti.findFirst({
    where: { id: userId, org_id: orgId },
    select: { stripe_user_bundle_status: true },
  });

  if (isSubscriptionStatusActive(utente?.stripe_user_bundle_status)) {
    return [...ALL_MODULE_CODES];
  }

  const rows = await prisma.utenteModuli.findMany({
    where: {
      utente_id: userId,
      org_id: orgId,
      OR: [
        { AND: [{ attivo: true }, { stripe_subscription_id: null }] },
        { stripe_subscription_status: { in: Array.from(ACTIVE_SUBSCRIPTION_STATUSES) } },
      ],
    },
    include: {
      moduli: { select: { code: true } },
    },
  });

  return rows.map((row) => row.moduli.code as ModuleCode);
}

export async function isModuleActiveForUser(
  userId: string,
  orgId: string,
  moduleCode: ModuleCode
): Promise<boolean> {
  const utente = await prisma.utenti.findFirst({
    where: { id: userId, org_id: orgId },
    select: { stripe_user_bundle_status: true },
  });

  if (isSubscriptionStatusActive(utente?.stripe_user_bundle_status)) {
    return true;
  }

  const row = await prisma.utenteModuli.findFirst({
    where: {
      utente_id: userId,
      org_id: orgId,
      moduli: { code: moduleCode },
      OR: [
        { AND: [{ attivo: true }, { stripe_subscription_id: null }] },
        { stripe_subscription_status: { in: Array.from(ACTIVE_SUBSCRIPTION_STATUSES) } },
      ],
    },
    select: { id: true },
  });

  return Boolean(row);
}

export async function setModuleActiveForUser(
  userId: string,
  orgId: string,
  moduleCode: ModuleCode,
  attivo: boolean
): Promise<void> {
  const modulo = await prisma.moduli.findUnique({
    where: { code: moduleCode },
    select: { id: true },
  });

  if (!modulo) {
    throw new Error('Modulo non trovato');
  }

  const utente = await prisma.utenti.findFirst({
    where: { id: userId, org_id: orgId },
    select: { id: true },
  });

  if (!utente) {
    throw new Error('Utente non trovato');
  }

  await prisma.utenteModuli.upsert({
    where: {
      utente_id_modulo_id: {
        utente_id: userId,
        modulo_id: modulo.id,
      },
    },
    create: {
      utente_id: userId,
      modulo_id: modulo.id,
      org_id: orgId,
      attivo,
    },
    update: {
      attivo,
      updated_at: new Date(),
    },
  });
}

export async function syncModuleSubscription(params: {
  userId: string;
  orgId: string;
  moduleCode: ModuleCode;
  subscriptionId: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  attivo: boolean;
}): Promise<void> {
  const modulo = await prisma.moduli.findUnique({
    where: { code: params.moduleCode },
    select: { id: true },
  });

  if (!modulo) {
    throw new Error('Modulo non trovato');
  }

  await prisma.utenteModuli.upsert({
    where: {
      utente_id_modulo_id: {
        utente_id: params.userId,
        modulo_id: modulo.id,
      },
    },
    create: {
      utente_id: params.userId,
      modulo_id: modulo.id,
      org_id: params.orgId,
      attivo: params.attivo,
      stripe_subscription_id: params.subscriptionId,
      stripe_subscription_status: params.subscriptionStatus,
      trial_ends_at: params.trialEndsAt,
    },
    update: {
      attivo: params.attivo,
      stripe_subscription_id: params.subscriptionId,
      stripe_subscription_status: params.subscriptionStatus,
      trial_ends_at: params.trialEndsAt,
      updated_at: new Date(),
    },
  });
}

export async function syncUserBundleSubscription(params: {
  userId: string;
  orgId: string;
  subscriptionId: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  attivo?: boolean;
}): Promise<void> {
  const attivo = params.attivo ?? isSubscriptionStatusActive(params.subscriptionStatus);

  await prisma.utenti.update({
    where: { id: params.userId },
    data: {
      stripe_user_bundle_subscription_id: params.subscriptionId,
      stripe_user_bundle_status: params.subscriptionStatus,
      user_bundle_trial_ends_at: params.trialEndsAt,
      updated_at: new Date(),
    },
  });

  for (const moduleCode of ALL_MODULE_CODES) {
    await syncModuleSubscription({
      userId: params.userId,
      orgId: params.orgId,
      moduleCode,
      subscriptionId: params.subscriptionId,
      subscriptionStatus: params.subscriptionStatus,
      trialEndsAt: params.trialEndsAt,
      attivo,
    });
  }
}

function isStripeResourceMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'resource_missing'
  );
}

/** Allinea DB con Stripe (fallback se webhook in ritardo o mancante). */
export async function refreshUserStripeSubscriptions(userId: string, orgId: string): Promise<void> {
  if (!isStripeConfigured()) return;

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();

  const utente = await prisma.utenti.findFirst({
    where: { id: userId, org_id: orgId },
    select: { stripe_user_bundle_subscription_id: true },
  });

  if (utente?.stripe_user_bundle_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(utente.stripe_user_bundle_subscription_id);
      const storedStatus = subscriptionStatusForStorage(sub);
      await syncUserBundleSubscription({
        userId,
        orgId,
        subscriptionId: sub.id,
        subscriptionStatus: storedStatus,
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        attivo: isStripeSubscriptionGrantedAccess(sub),
      });
    } catch (error) {
      if (isStripeResourceMissing(error)) {
        await syncUserBundleSubscription({
          userId,
          orgId,
          subscriptionId: utente.stripe_user_bundle_subscription_id,
          subscriptionStatus: 'canceled',
          trialEndsAt: null,
          attivo: false,
        });
      } else {
        console.error('[stripe] refresh bundle subscription error:', error);
      }
    }
  }

  const moduleRows = await prisma.utenteModuli.findMany({
    where: {
      utente_id: userId,
      org_id: orgId,
      stripe_subscription_id: { not: null },
    },
    include: { moduli: { select: { code: true } } },
  });

  const bundleSubId = utente?.stripe_user_bundle_subscription_id;

  for (const row of moduleRows) {
    if (!row.stripe_subscription_id || row.stripe_subscription_id === bundleSubId) {
      continue;
    }

    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      await syncModuleSubscription({
        userId,
        orgId,
        moduleCode: row.moduli.code as ModuleCode,
        subscriptionId: sub.id,
        subscriptionStatus: subscriptionStatusForStorage(sub),
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        attivo: isStripeSubscriptionGrantedAccess(sub),
      });
    } catch (error) {
      if (isStripeResourceMissing(error)) {
        await syncModuleSubscription({
          userId,
          orgId,
          moduleCode: row.moduli.code as ModuleCode,
          subscriptionId: row.stripe_subscription_id,
          subscriptionStatus: 'canceled',
          trialEndsAt: null,
          attivo: false,
        });
      } else {
        console.error('[stripe] refresh module subscription error:', error);
      }
    }
  }
}

export async function getOrCreateStripeCustomerId(
  userId: string,
  orgId: string
): Promise<{ customerId: string; email: string | null; nome: string; cognome: string }> {
  const utente = await prisma.utenti.findFirst({
    where: { id: userId, org_id: orgId },
    select: {
      id: true,
      email: true,
      nome: true,
      cognome: true,
      stripe_customer_id: true,
    },
  });

  if (!utente) {
    throw new Error('Utente non trovato');
  }

  if (utente.stripe_customer_id) {
    return {
      customerId: utente.stripe_customer_id,
      email: utente.email,
      nome: utente.nome,
      cognome: utente.cognome,
    };
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email: utente.email || undefined,
    name: `${utente.nome} ${utente.cognome}`.trim(),
    metadata: {
      user_id: userId,
      org_id: orgId,
    },
  });

  await prisma.utenti.update({
    where: { id: userId },
    data: { stripe_customer_id: customer.id, updated_at: new Date() },
  });

  return {
    customerId: customer.id,
    email: utente.email,
    nome: utente.nome,
    cognome: utente.cognome,
  };
}

export async function getUserBillingSummary(userId: string, orgId: string) {
  const utente = await prisma.utenti.findFirst({
    where: { id: userId, org_id: orgId },
    select: {
      stripe_customer_id: true,
      stripe_user_bundle_subscription_id: true,
      stripe_user_bundle_status: true,
      user_bundle_trial_ends_at: true,
    },
  });

  const moduleSubs = await prisma.utenteModuli.findMany({
    where: { utente_id: userId, org_id: orgId },
    include: { moduli: { select: { code: true, nome: true } } },
  });

  return {
    hasBundle: Boolean(utente?.stripe_user_bundle_subscription_id),
    bundleStatus: utente?.stripe_user_bundle_status ?? null,
    bundleTrialEndsAt: utente?.user_bundle_trial_ends_at?.toISOString() ?? null,
    stripeCustomerId: utente?.stripe_customer_id ?? null,
    modules: moduleSubs.map((row) => ({
      code: row.moduli.code,
      nome: row.moduli.nome,
      attivo:
        (row.attivo && !row.stripe_subscription_id) ||
        isSubscriptionStatusActive(row.stripe_subscription_status),
      subscriptionStatus: row.stripe_subscription_status,
      trialEndsAt: row.trial_ends_at?.toISOString() ?? null,
    })),
  };
}
