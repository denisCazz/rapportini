import { ModuleCode, MODULE_CODES } from '@/lib/modules';

/** Costo mensile per singolo modulo (IVA esclusa). */
export const MODULE_MONTHLY_PRICE_EUR = 6;

/** Bundle utente: tutti i moduli (IVA esclusa). */
export const USER_BUNDLE_MONTHLY_PRICE_EUR = 29;

/** Giorni di prova gratuita (primo mese). */
export const MODULE_TRIAL_DAYS = 30;

/** Alias centralizzato per trial su moduli, bundle utente e bundle CAT. */
export const SUBSCRIPTION_TRIAL_DAYS = MODULE_TRIAL_DAYS;

export interface ModuleEarningsEstimate {
  minMonthlyEur: number;
  maxMonthlyEur: number;
  rationale: string;
}

export const MODULE_EARNINGS_ESTIMATES: Record<ModuleCode, ModuleEarningsEstimate> = {
  [MODULE_CODES.PIANIFICAZIONE_INTERVENTI]: {
    minMonthlyEur: 200,
    maxMonthlyEur: 360,
    rationale:
      'Riduce 8-12 ore/mese di coordinamento e pianificazione manuale (€30/ora), evitando sovrapposizioni e viaggi inutili.',
  },
  [MODULE_CODES.ASSEGNAZIONE_LAVORI]: {
    minMonthlyEur: 120,
    maxMonthlyEur: 240,
    rationale:
      'Ottimizza il carico di lavoro dei tecnici risparmiando 4-8 ore/mese in assegnazioni e riorganizzazioni (€30/ora).',
  },
  [MODULE_CODES.NOTIFICHE_SCADENZE]: {
    minMonthlyEur: 160,
    maxMonthlyEur: 480,
    rationale:
      'Recupera 2-4 interventi di manutenzione extra al mese grazie ai promemoria automatici (€80-120 per intervento).',
  },
  [MODULE_CODES.MAGAZZINO_RICAMBI]: {
    minMonthlyEur: 80,
    maxMonthlyEur: 200,
    rationale:
      'Evita fermi macchina e ordini urgenti grazie al controllo giacenze e alert sotto soglia.',
  },
  [MODULE_CODES.REPORT_CLIENTE]: {
    minMonthlyEur: 60,
    maxMonthlyEur: 150,
    rationale:
      'Migliora la comunicazione con il cliente e riduce richieste di copia rapportino.',
  },
  [MODULE_CODES.PREVENTIVI]: {
    minMonthlyEur: 150,
    maxMonthlyEur: 400,
    rationale:
      'Accelera la chiusura lavori con preventivi professionali e conversione rapida in rapportino.',
  },
  [MODULE_CODES.PLANNER]: {
    minMonthlyEur: 180,
    maxMonthlyEur: 420,
    rationale:
      'Riduce km percorsi e tempo in viaggio con percorsi ottimizzati; centralizza contatti e note cliente.',
  },
};

export function getModuleEarningsEstimate(code: ModuleCode): ModuleEarningsEstimate {
  return MODULE_EARNINGS_ESTIMATES[code];
}

export function formatEarningsRange(estimate: ModuleEarningsEstimate): string {
  return `€${estimate.minMonthlyEur} – €${estimate.maxMonthlyEur}`;
}
