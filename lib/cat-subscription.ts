import { prisma } from '@/lib/db';
import { calcCatLicensePriceEur } from '@/lib/cat-pricing';
import { isSubscriptionStatusActive } from '@/lib/module-access';
import { CAT_STATO } from '@/lib/cat-status';

export async function countActiveCatOperators(orgId: string): Promise<number> {
  return prisma.utenti.count({
    where: { org_id: orgId, ruolo: 'operatore', attivo: true },
  });
}

export async function getCatSubscription(orgId: string) {
  return prisma.organizzazioni.findFirst({
    where: { org_id: orgId, tipo: 'cat' },
    select: {
      org_id: true,
      stato: true,
      stripe_customer_id: true,
      stripe_subscription_id: true,
      stripe_subscription_status: true,
      licensed_operator_slots: true,
    },
  });
}

export async function isCatBundleSubscriptionActive(orgId: string): Promise<boolean> {
  const org = await getCatSubscription(orgId);
  if (!org) return false;
  if (org.stato !== CAT_STATO.ATTIVO) return false;
  return isSubscriptionStatusActive(org.stripe_subscription_status);
}

export async function getOrCreateCatStripeCustomer(
  orgId: string,
  adminUserId: string
): Promise<{ customerId: string; email: string | null; nome: string }> {
  const org = await prisma.organizzazioni.findFirst({
    where: { org_id: orgId, tipo: 'cat' },
    select: {
      stripe_customer_id: true,
      nome_azienda: true,
      pec: true,
    },
  });

  if (!org) {
    throw new Error('CAT non trovato');
  }

  const admin = await prisma.utenti.findFirst({
    where: { id: adminUserId, org_id: orgId, ruolo: 'admin_cat' },
    select: { email: true, nome: true, cognome: true },
  });

  if (!org.stripe_customer_id) {
    const { getStripe } = await import('@/lib/stripe');
    const stripe = getStripe();

    const customer = await stripe.customers.create({
      email: admin?.email || org.pec || undefined,
      name: org.nome_azienda || `${admin?.nome ?? ''} ${admin?.cognome ?? ''}`.trim() || undefined,
      metadata: {
        org_id: orgId,
        subscription_type: 'cat_bundle',
      },
    });

    await prisma.organizzazioni.update({
      where: { org_id: orgId },
      data: { stripe_customer_id: customer.id, updated_at: new Date() },
    });

    return {
      customerId: customer.id,
      email: admin?.email || org.pec || null,
      nome: org.nome_azienda || admin?.nome || 'CAT',
    };
  }

  return {
    customerId: org.stripe_customer_id,
    email: admin?.email || org.pec || null,
    nome: org.nome_azienda || admin?.nome || 'CAT',
  };
}

export async function syncCatBundleSubscription(params: {
  orgId: string;
  subscriptionId: string;
  subscriptionStatus: string;
  operatorSlots: number;
}): Promise<void> {
  const active = isSubscriptionStatusActive(params.subscriptionStatus);
  const stato =
    params.subscriptionStatus === 'canceled' ||
    params.subscriptionStatus === 'unpaid' ||
    params.subscriptionStatus === 'past_due'
      ? CAT_STATO.SOSPESO
      : active
        ? CAT_STATO.ATTIVO
        : undefined;

  await prisma.organizzazioni.update({
    where: { org_id: params.orgId },
    data: {
      stripe_subscription_id: params.subscriptionId,
      stripe_subscription_status: params.subscriptionStatus,
      licensed_operator_slots: params.operatorSlots,
      ...(stato ? { stato } : {}),
      updated_at: new Date(),
    },
  });
}

export async function getCatBundleCheckoutPrice(orgId: string): Promise<{
  operatorCount: number;
  monthlyPriceEur: number;
}> {
  const operatorCount = await countActiveCatOperators(orgId);
  return {
    operatorCount,
    monthlyPriceEur: calcCatLicensePriceEur(operatorCount),
  };
}
