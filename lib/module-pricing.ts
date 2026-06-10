import { ModuleCode, MODULE_CODES } from '@/lib/modules';

/** Costo mensile per singolo modulo (IVA esclusa). */
export const MODULE_MONTHLY_PRICE_EUR = 6;

/** Giorni di prova gratuita (primo mese). */
export const MODULE_TRIAL_DAYS = 30;

/**
 * Stime di guadagno mensile per modulo, basate su ANALISI_TEMPO_RISPARMIATO.md
 * (costo orario tecnico €30, team 3-5 tecnici, 60-150 interventi/mese).
 */
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
};

export function getModuleEarningsEstimate(code: ModuleCode): ModuleEarningsEstimate {
  return MODULE_EARNINGS_ESTIMATES[code];
}

export function formatEarningsRange(estimate: ModuleEarningsEstimate): string {
  return `€${estimate.minMonthlyEur} – €${estimate.maxMonthlyEur}`;
}
