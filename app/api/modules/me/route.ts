import { NextRequest, NextResponse } from 'next/server';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { getActiveModuleCodesForUser } from '@/lib/module-access';
import {
  formatEarningsRange,
  getModuleEarningsEstimate,
  MODULE_MONTHLY_PRICE_EUR,
  MODULE_TRIAL_DAYS,
} from '@/lib/module-pricing';
import { PAID_MODULES } from '@/lib/modules';
import { isStripeConfigured } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const orgId = getOrgIdFromRequest(request);
    const activeCodes = await getActiveModuleCodesForUser(userId, orgId);

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
    });
  } catch (error) {
    console.error('GET /api/modules/me error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento dei moduli' }, { status: 500 });
  }
}
