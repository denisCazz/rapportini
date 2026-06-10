import { prisma } from '@/lib/db';
import { ModuleCode } from '@/lib/modules';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active']);

export function isSubscriptionStatusActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

export async function getActiveModuleCodesForUser(
  userId: string,
  orgId: string
): Promise<ModuleCode[]> {
  const rows = await prisma.utenteModuli.findMany({
    where: {
      utente_id: userId,
      org_id: orgId,
      OR: [
        { attivo: true },
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
  const row = await prisma.utenteModuli.findFirst({
    where: {
      utente_id: userId,
      org_id: orgId,
      moduli: { code: moduleCode },
      OR: [
        { attivo: true },
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
