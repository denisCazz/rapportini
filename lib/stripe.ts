import Stripe from 'stripe';
import { ModuleCode } from '@/lib/modules';
import {
  MODULE_MONTHLY_PRICE_EUR,
  SUBSCRIPTION_TRIAL_DAYS,
  USER_BUNDLE_MONTHLY_PRICE_EUR,
} from '@/lib/module-pricing';
import {
  CAT_BASE_PRICE_EUR,
  CAT_EXTRA_OPERATOR_PRICE_EUR,
  calcCatLicensePriceEur,
} from '@/lib/cat-pricing';
import {
  getCatBaseStripePriceId,
  getCatExtraStripePriceId,
  getModuleStripePriceId,
  getUserBundleStripePriceId,
} from '@/lib/stripe-prices';

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

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
}

/**
 * In dev usa l'host della richiesta (localhost) così il ritorno da Stripe torna all'app locale.
 */
export function resolveCheckoutBaseUrl(request?: { headers: Headers }): string {
  if (request) {
    const origin = request.headers.get('origin')?.replace(/\/$/, '');
    if (origin) {
      try {
        if (isLocalHost(new URL(origin).hostname)) return origin;
      } catch {
        /* ignore */
      }
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = (request.headers.get('x-forwarded-proto') || 'http').split(',')[0].trim();
    if (host) {
      const hostname = host.split(':')[0];
      if (isLocalHost(hostname)) {
        return `${proto}://${host}`.replace(/\/$/, '');
      }
    }
  }

  return getAppBaseUrl();
}

export const MODULE_SUBSCRIPTION_TRIAL_DAYS = SUBSCRIPTION_TRIAL_DAYS;

/** Solo carta: evita redirect Satispay/Klarna/Link su abbonamenti (SetupIntent async). */
export function subscriptionCheckoutDefaults(): Pick<
  Stripe.Checkout.SessionCreateParams,
  'payment_method_types' | 'locale'
> {
  return {
    payment_method_types: ['card'],
    locale: 'it',
  };
}

export function checkoutSuccessUrl(path: string, baseUrl?: string): string {
  const base = (baseUrl || getAppBaseUrl()).replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
}

export function checkoutCancelUrl(path: string, baseUrl?: string): string {
  const base = (baseUrl || getAppBaseUrl()).replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}?checkout=cancel`;
}

/** @deprecated usa subscriptionCheckoutDefaults() */
export const SUBSCRIPTION_CHECKOUT_OPTIONS = subscriptionCheckoutDefaults();
/** @deprecated usa checkoutSuccessUrl() */
export const subscriptionCheckoutSuccessUrl = checkoutSuccessUrl;
/** @deprecated usa checkoutCancelUrl() */
export const subscriptionCheckoutCancelUrl = checkoutCancelUrl;

export function buildModuleCheckoutMetadata(params: {
  userId: string;
  orgId: string;
  moduleCode: ModuleCode;
}): Record<string, string> {
  return {
    subscription_type: 'module',
    user_id: params.userId,
    org_id: params.orgId,
    module_code: params.moduleCode,
  };
}

export function buildUserBundleCheckoutMetadata(params: {
  userId: string;
  orgId: string;
}): Record<string, string> {
  return {
    subscription_type: 'user_bundle',
    user_id: params.userId,
    org_id: params.orgId,
  };
}

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

async function priceLineItem(
  priceId: string | null,
  fallback: Stripe.Checkout.SessionCreateParams.LineItem
): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }
  return fallback;
}

export async function moduleSubscriptionLineItem(
  moduleCode: ModuleCode,
  moduleName: string
): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  const priceId = await getModuleStripePriceId(moduleCode);
  return priceLineItem(priceId, {
    price_data: {
      currency: 'eur',
      unit_amount: MODULE_MONTHLY_PRICE_EUR * 100,
      product_data: {
        name: `Bitora — ${moduleName}`,
        description: 'Abbonamento mensile modulo (primo mese gratuito)',
      },
      recurring: { interval: 'month' },
    },
    quantity: 1,
  });
}

export async function userBundleSubscriptionLineItem(): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  const priceId = await getUserBundleStripePriceId();
  return priceLineItem(priceId, {
    price_data: {
      currency: 'eur',
      unit_amount: USER_BUNDLE_MONTHLY_PRICE_EUR * 100,
      product_data: {
        name: 'Bitora — Bundle tutti i moduli',
        description: 'Tutti i moduli per un operatore (primo mese gratuito)',
      },
      recurring: { interval: 'month' },
    },
    quantity: 1,
  });
}

export async function catBundleSubscriptionLineItems(params: {
  operatorCount: number;
}): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  const basePriceId = await getCatBaseStripePriceId();
  const extraPriceId = await getCatExtraStripePriceId();
  const extraSlots = Math.max(0, params.operatorCount - 2);

  if (basePriceId && extraPriceId) {
    const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: basePriceId, quantity: 1 },
    ];
    if (extraSlots > 0) {
      items.push({ price: extraPriceId, quantity: extraSlots });
    }
    return items;
  }

  const monthlyPriceEur = calcCatLicensePriceEur(params.operatorCount);
  const slotsLabel =
    params.operatorCount <= 2
      ? 'fino a 2 operatori'
      : `${params.operatorCount} operatori`;

  return [
    {
      price_data: {
        currency: 'eur',
        unit_amount: monthlyPriceEur * 100,
        product_data: {
          name: 'Bitora — Pacchetto moduli CAT',
          description: `Tutti i moduli per ${slotsLabel} (primo mese gratuito)`,
        },
        recurring: { interval: 'month' },
      },
      quantity: 1,
    },
  ];
}

/** @deprecated use catBundleSubscriptionLineItems */
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
        description: `Tutti i moduli per ${slotsLabel} (€${CAT_BASE_PRICE_EUR} base + €${CAT_EXTRA_OPERATOR_PRICE_EUR}/operatore extra)`,
      },
      recurring: { interval: 'month' },
    },
    quantity: 1,
  };
}
