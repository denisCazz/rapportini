import { prisma } from '@/lib/db';
import { ModuleCode } from '@/lib/modules';
import {
  MODULE_MONTHLY_PRICE_EUR,
  USER_BUNDLE_MONTHLY_PRICE_EUR,
} from '@/lib/module-pricing';
import {
  CAT_BASE_PRICE_EUR,
  CAT_EXTRA_OPERATOR_PRICE_EUR,
} from '@/lib/cat-pricing';

/** Env override per bundle (non legati a singolo modulo). */
export function getStripePriceIdFromEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value || null;
}

export const STRIPE_PRICE_ENV_KEYS = {
  USER_BUNDLE: 'STRIPE_PRICE_BUNDLE_USER',
  CAT_BASE: 'STRIPE_PRICE_CAT_BASE',
  CAT_EXTRA: 'STRIPE_PRICE_CAT_EXTRA',
} as const;

const modulePriceEnvKey = (code: ModuleCode): string =>
  `STRIPE_PRICE_MODULE_${code.toUpperCase()}`;

export async function getModuleStripePriceId(moduleCode: ModuleCode): Promise<string | null> {
  const fromEnv = getStripePriceIdFromEnv(modulePriceEnvKey(moduleCode));
  if (fromEnv) return fromEnv;

  const row = await prisma.moduli.findUnique({
    where: { code: moduleCode },
    select: { stripe_price_id: true },
  });
  return row?.stripe_price_id?.trim() || null;
}

export async function getUserBundleStripePriceId(): Promise<string | null> {
  return getStripePriceIdFromEnv(STRIPE_PRICE_ENV_KEYS.USER_BUNDLE);
}

export async function getCatBaseStripePriceId(): Promise<string | null> {
  return getStripePriceIdFromEnv(STRIPE_PRICE_ENV_KEYS.CAT_BASE);
}

export async function getCatExtraStripePriceId(): Promise<string | null> {
  return getStripePriceIdFromEnv(STRIPE_PRICE_ENV_KEYS.CAT_EXTRA);
}

export interface StripeCatalogProduct {
  moduleCode?: ModuleCode;
  name: string;
  description: string;
  amountEur: number;
  metadata: Record<string, string>;
}

export const STRIPE_CATALOG: StripeCatalogProduct[] = [
  {
    moduleCode: 'pianificazione_interventi',
    name: 'Bitora — Pianificazione interventi',
    description: 'Abbonamento mensile modulo (primo mese gratuito)',
    amountEur: MODULE_MONTHLY_PRICE_EUR,
    metadata: { module_code: 'pianificazione_interventi', product_type: 'module' },
  },
  {
    moduleCode: 'assegnazione_lavori',
    name: 'Bitora — Assegnazione lavori',
    description: 'Abbonamento mensile modulo (primo mese gratuito)',
    amountEur: MODULE_MONTHLY_PRICE_EUR,
    metadata: { module_code: 'assegnazione_lavori', product_type: 'module' },
  },
  {
    moduleCode: 'notifiche_scadenze',
    name: 'Bitora — Notifiche scadenze',
    description: 'Abbonamento mensile modulo (primo mese gratuito)',
    amountEur: MODULE_MONTHLY_PRICE_EUR,
    metadata: { module_code: 'notifiche_scadenze', product_type: 'module' },
  },
  {
    moduleCode: 'magazzino_ricambi',
    name: 'Bitora — Magazzino ricambi',
    description: 'Abbonamento mensile modulo (primo mese gratuito)',
    amountEur: MODULE_MONTHLY_PRICE_EUR,
    metadata: { module_code: 'magazzino_ricambi', product_type: 'module' },
  },
  {
    moduleCode: 'report_cliente',
    name: 'Bitora — Report al cliente',
    description: 'Abbonamento mensile modulo (primo mese gratuito)',
    amountEur: MODULE_MONTHLY_PRICE_EUR,
    metadata: { module_code: 'report_cliente', product_type: 'module' },
  },
  {
    moduleCode: 'preventivi',
    name: 'Bitora — Preventivi',
    description: 'Abbonamento mensile modulo (primo mese gratuito)',
    amountEur: MODULE_MONTHLY_PRICE_EUR,
    metadata: { module_code: 'preventivi', product_type: 'module' },
  },
  {
    moduleCode: 'planner',
    name: 'Bitora — Planner',
    description: 'Abbonamento mensile modulo (primo mese gratuito)',
    amountEur: MODULE_MONTHLY_PRICE_EUR,
    metadata: { module_code: 'planner', product_type: 'module' },
  },
  {
    name: 'Bitora — Bundle tutti i moduli',
    description: 'Tutti i moduli per un operatore (primo mese gratuito)',
    amountEur: USER_BUNDLE_MONTHLY_PRICE_EUR, // €29

    metadata: { product_type: 'user_bundle' },
  },
  {
    name: 'Bitora — Pacchetto CAT base',
    description: 'Tutti i moduli per fino a 2 operatori (primo mese gratuito)',
    amountEur: CAT_BASE_PRICE_EUR,
    metadata: { product_type: 'cat_base' },
  },
  {
    name: 'Bitora — Operatore CAT extra',
    description: 'Operatore aggiuntivo oltre il pacchetto base',
    amountEur: CAT_EXTRA_OPERATOR_PRICE_EUR,
    metadata: { product_type: 'cat_extra' },
  },
];
