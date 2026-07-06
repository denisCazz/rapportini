export const MODULE_CODES = {
  PIANIFICAZIONE_INTERVENTI: 'pianificazione_interventi',
  ASSEGNAZIONE_LAVORI: 'assegnazione_lavori',
  NOTIFICHE_SCADENZE: 'notifiche_scadenze',
  MAGAZZINO_RICAMBI: 'magazzino_ricambi',
  REPORT_CLIENTE: 'report_cliente',
  PREVENTIVI: 'preventivi',
  PLANNER: 'planner',
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];

export const ALL_MODULE_CODES: ModuleCode[] = Object.values(MODULE_CODES);

export interface PaidModuleDefinition {
  code: ModuleCode;
  nome: string;
  descrizione: string;
  href: string;
}

export const PAID_MODULES: PaidModuleDefinition[] = [
  {
    code: MODULE_CODES.PIANIFICAZIONE_INTERVENTI,
    nome: 'Pianificazione interventi',
    descrizione: 'Calendario e pianificazione degli interventi tecnici',
    href: '/moduli/pianificazione-interventi',
  },
  {
    code: MODULE_CODES.ASSEGNAZIONE_LAVORI,
    nome: 'Assegnazione lavori ai tecnici',
    descrizione: 'Assegna e gestisci i lavori per ogni tecnico',
    href: '/moduli/assegnazione-lavori',
  },
  {
    code: MODULE_CODES.NOTIFICHE_SCADENZE,
    nome: 'Notifiche scadenze manutenzioni',
    descrizione: 'Avvisi automatici per le scadenze di manutenzione',
    href: '/moduli/notifiche-scadenze',
  },
  {
    code: MODULE_CODES.MAGAZZINO_RICAMBI,
    nome: 'Magazzino ricambi',
    descrizione: 'Gestione giacenze ricambi e alert sotto soglia',
    href: '/moduli/magazzino',
  },
  {
    code: MODULE_CODES.REPORT_CLIENTE,
    nome: 'Invia documentazione',
    descrizione: 'Invia rapportini e preventivi PDF via email al cliente',
    href: '/moduli/report-cliente',
  },
  {
    code: MODULE_CODES.PREVENTIVI,
    nome: 'Preventivi',
    descrizione: 'Creazione preventivi e conversione in rapportino',
    href: '/moduli/preventivi',
  },
  {
    code: MODULE_CODES.PLANNER,
    nome: 'Planner',
    descrizione: 'Pianificazione intelligente dei percorsi e CRM contatti',
    href: '/moduli/planner',
  },
];

export function getModuleByCode(code: string): PaidModuleDefinition | undefined {
  return PAID_MODULES.find((m) => m.code === code);
}

export function getModuleByHref(href: string): PaidModuleDefinition | undefined {
  return PAID_MODULES.find((m) => m.href === href);
}
