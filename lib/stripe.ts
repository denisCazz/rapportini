import Stripe from 'stripe';
import { ModuleCode } from '@/lib/modules';
import { MODULE_MONTHLY_PRICE_EUR, MODULE_TRIAL_DAYS } from '@/lib/module-pricing';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('Stripe non configurato: imposta STRIPE_SECRET_KEY');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  return stripeClient;
}

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function buildModuleCheckoutMetadata(params: {
  userId: string;
  orgId: string;
  moduleCode: ModuleCode;
}): Record<string, string> {
  return {
    user_id: params.userId,
    org_id: params.orgId,
    module_code: params.moduleCode,
  };
}

export function moduleSubscriptionLineItem(moduleName: string): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: 'eur',
      unit_amount: MODULE_MONTHLY_PRICE_EUR * 100,
      product_data: {
        name: `Bitora — ${moduleName}`,
        description: `Abbonamento mensile modulo (primo mese gratuito)`,
      },
      recurring: {
        interval: 'month',
      },
    },
    quantity: 1,
  };
}

export const MODULE_SUBSCRIPTION_TRIAL_DAYS = MODULE_TRIAL_DAYS;

export function buildCatBundleCheckoutMetadata(params: {
  orgId: string;
  adminUserId: string;
  operatorCount: number;
}): Record<string, string> {
  return {
    subscription_type: 'cat_bundle',
    org_id: params.orgId,
    admin_user_id: params.adminUserId,
    operator_count: String(params.operatorCount),
  };
}

export function catBundleSubscriptionLineItem(params: {
  monthlyPriceEur: number;
  operatorCount: number;
}): Stripe.Checkout.SessionCreateParams.LineItem {
  const slotsLabel =
    params.operatorCount <= 2
      ? 'fino a 2 operatori'
      : `${params.operatorCount} operatori`;

  return {
    price_data: {
      currency: 'eur',
      unit_amount: params.monthlyPriceEur * 100,
      product_data: {
        name: 'Bitora — Pacchetto moduli CAT',
        description: `Tutti i moduli per ${slotsLabel} (€30 base + €5/operatore extra)`,
      },
      recurring: {
        interval: 'month',
      },
    },
    quantity: 1,
  };
}
