import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getActiveModuleCodesForUser, refreshUserStripeSubscriptions } from '@/lib/module-access';
import {
  formatEarningsRange,
  getModuleEarningsEstimate,
  MODULE_MONTHLY_PRICE_EUR,
  MODULE_TRIAL_DAYS,
  USER_BUNDLE_MONTHLY_PRICE_EUR,
} from '@/lib/module-pricing';
import { PAID_MODULES } from '@/lib/modules';
import { isStripeConfigured } from '@/lib/stripe';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) {
      return tenant.response;
    }

    const { id: userId, org_id: orgId, ruolo } = tenant.user;

    if (isStripeConfigured()) {
      try {
        await refreshUserStripeSubscriptions(userId, orgId);
      } catch (error) {
        console.error('[stripe] refresh on /api/modules/me failed:', error);
      }
    }

    let activeCodes = await getActiveModuleCodesForUser(userId, orgId);

    // Admin CAT con pacchetto attivo: tutti i moduli accessibili.
    const { isCatAdmin } = await import('@/lib/roles');
    if (isCatAdmin(ruolo)) {
      const { isCatBundleSubscriptionActive } = await import('@/lib/cat-subscription');
      if (await isCatBundleSubscriptionActive(orgId)) {
        activeCodes = PAID_MODULES.map((m) => m.code);
      }
    }

    const subscriptions = await prisma.utenteModuli.findMany({
      where: { utente_id: userId, org_id: orgId },
      select: {
        stripe_subscription_status: true,
        trial_ends_at: true,
        moduli: { select: { code: true } },
      },
    });

    const subscriptionByCode = new Map(
      subscriptions.map((row) => [row.moduli.code, row])
    );

    const modules = PAID_MODULES.map((modulo) => {
      const estimate = getModuleEarningsEstimate(modulo.code);
      const sub = subscriptionByCode.get(modulo.code);

      return {
        code: modulo.code,
        nome: modulo.nome,
        descrizione: modulo.descrizione,
        href: modulo.href,
        attivo: activeCodes.includes(modulo.code),
        pricing: {
          monthlyPriceEur: MODULE_MONTHLY_PRICE_EUR,
          trialDays: MODULE_TRIAL_DAYS,
          earningsEstimate: {
            minMonthlyEur: estimate.minMonthlyEur,
            maxMonthlyEur: estimate.maxMonthlyEur,
            label: formatEarningsRange(estimate),
            rationale: estimate.rationale,
          },
        },
        subscription: sub
          ? {
              status: sub.stripe_subscription_status,
              trialEndsAt: sub.trial_ends_at?.toISOString() ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({
      data: modules,
      stripeEnabled: isStripeConfigured(),
      pricing: {
        moduleMonthlyEur: MODULE_MONTHLY_PRICE_EUR,
        userBundleMonthlyEur: USER_BUNDLE_MONTHLY_PRICE_EUR,
        trialDays: MODULE_TRIAL_DAYS,
      },
    });
  } catch (error) {
    console.error('GET /api/modules/me error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento dei moduli' }, { status: 500 });
  }
}
