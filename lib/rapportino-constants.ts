export const TIPOLOGIA_INTERVENTO_VALUES = [
  'prima_accensione',
  'manutenzione_annuale',
  'guasto',
  'in_garanzia',
  'non_in_garanzia',
] as const;

export type TipologiaIntervento = (typeof TIPOLOGIA_INTERVENTO_VALUES)[number];

export const TIPOLOGIA_INTERVENTO_LABELS: Record<TipologiaIntervento, string> = {
  prima_accensione: '1° accensione',
  manutenzione_annuale: 'Manutenzione annuale',
  guasto: 'Guasto',
  in_garanzia: 'In garanzia',
  non_in_garanzia: 'Non in garanzia',
};

export const TIPOLOGIA_INSTALLAZIONE_VALUES = [
  'scarico_parete',
  'canna_fumaria',
  'canna_fumaria_intubata',
] as const;

export type TipologiaInstallazione = (typeof TIPOLOGIA_INSTALLAZIONE_VALUES)[number];

export const TIPOLOGIA_INSTALLAZIONE_LABELS: Record<TipologiaInstallazione, string> = {
  scarico_parete: 'Scarico a parete',
  canna_fumaria: 'In canna fumaria',
  canna_fumaria_intubata: 'In canna fumaria intubata',
};

export const SI_NO_NC_VALUES = ['si', 'no', 'nc'] as const;

export type SiNoNc = (typeof SI_NO_NC_VALUES)[number];

export const SI_NO_NC_LABELS: Record<SiNoNc, string> = {
  si: 'Sì',
  no: 'No',
  nc: 'N.C.',
};

export const CONTROLLO_GARANZIA_FIELDS = [
  {
    key: 'spiegataManutenzione',
    label: 'Spiegata manutenzione ordinaria e straordinaria',
  },
  {
    key: 'impiantoElettrico',
    label: 'Impianto elettrico a norma',
  },
  {
    key: 'condottoFumi',
    label: 'Condotto fumi secondo istruzioni di montaggio apparecchi',
  },
  {
    key: 'installazioneUni10683',
    label: 'Installazione apparecchio secondo istruzioni di montaggio secondo normativa UNI 10683',
  },
  {
    key: 'controlloParametri',
    label: 'Controllo parametri di funzionamento e taratura stufa',
  },
] as const;

export type ControlloGaranziaKey = (typeof CONTROLLO_GARANZIA_FIELDS)[number]['key'];

export const CONDIZIONI_GARANZIA_INTRO =
  'La garanzia del produttore può decadere nei casi previsti dalle condizioni di vendita e assistenza, tra cui:';

export const CONDIZIONI_GARANZIA_ITEMS = [
  'Installazione non conforme alle normative vigenti e alle istruzioni del costruttore',
  'Scarico fumi non conforme alla normativa UNI 10683 o successive modifiche',
  'Utilizzo improprio dell\'apparecchio',
  'Utilizzo di combustibili non idonei',
  'Mancata esecuzione della manutenzione periodica prevista',
  'Modifica non autorizzata dei parametri di funzionamento',
  'Interventi eseguiti da personale non autorizzato',
  'Tubazioni o canali da fumo ostruiti o non idonei',
] as const;

export const CONDIZIONI_GARANZIA_DICHIARAZIONE =
  'Il cliente dichiara di aver preso visione delle suddette condizioni.';

export const CONDIZIONI_GARANZIA_CHECKBOX_LABEL = 'Presa visione delle condizioni di garanzia';

export function formatSiNoNc(value?: SiNoNc | null): string {
  if (!value) return '—';
  return SI_NO_NC_LABELS[value];
}

export function formatTipologiaIntervento(value?: TipologiaIntervento | string | null): string {
  if (!value) return '—';
  if (value in TIPOLOGIA_INTERVENTO_LABELS) {
    return TIPOLOGIA_INTERVENTO_LABELS[value as TipologiaIntervento];
  }
  return value;
}

export function formatTipologiaInstallazione(value?: TipologiaInstallazione | string | null): string {
  if (!value) return '—';
  if (value in TIPOLOGIA_INSTALLAZIONE_LABELS) {
    return TIPOLOGIA_INSTALLAZIONE_LABELS[value as TipologiaInstallazione];
  }
  return value;
}
