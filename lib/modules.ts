export const MODULE_CODES = {
  PIANIFICAZIONE_INTERVENTI: 'pianificazione_interventi',
  ASSEGNAZIONE_LAVORI: 'assegnazione_lavori',
  NOTIFICHE_SCADENZE: 'notifiche_scadenze',
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];

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
];

export function getModuleByCode(code: string): PaidModuleDefinition | undefined {
  return PAID_MODULES.find((m) => m.code === code);
}

export function getModuleByHref(href: string): PaidModuleDefinition | undefined {
  return PAID_MODULES.find((m) => m.href === href);
}
