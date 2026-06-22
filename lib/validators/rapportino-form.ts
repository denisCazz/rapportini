import { format } from 'date-fns';
import { z } from 'zod';
import type { Rapportino } from '@/types';
import { isAcceptedFirma } from '@/lib/signature';
import {
  SI_NO_NC_VALUES,
  TIPOLOGIA_INSTALLAZIONE_VALUES,
  TIPOLOGIA_INTERVENTO_VALUES,
} from '@/lib/rapportino-constants';

const req = z.string().trim().min(1, 'Campo obbligatorio');
const optStr = z.string().optional();
const firmaReq = z
  .string()
  .refine((value) => isAcceptedFirma(value), { message: 'Firma obbligatoria' });

export const operatoreSchema = z.object({
  nome: req,
  cognome: req,
  telefono: req,
  email: z.string(),
  qualifica: req,
});

export const clienteSchema = z.object({
  nome: req,
  cognome: req,
  ragioneSociale: optStr,
  via: optStr,
  numeroCivico: optStr,
  indirizzo: optStr,
  citta: req,
  cap: optStr,
  provincia: optStr,
  telefono: req,
  email: optStr,
  partitaIva: optStr,
  codiceFiscale: optStr,
}).superRefine((data, ctx) => {
  if (!data.via?.trim() && !data.indirizzo?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['via'], message: 'Via obbligatoria' });
  }
});

const siNoNcSchema = z.enum(SI_NO_NC_VALUES).optional();

export const controlloGaranziaSchema = z.object({
  spiegataManutenzione: siNoNcSchema,
  impiantoElettrico: siNoNcSchema,
  condottoFumi: siNoNcSchema,
  installazioneUni10683: siNoNcSchema,
  controlloParametri: siNoNcSchema,
});

export const interventoSchema = z.object({
  dataRichiesta: optStr,
  data: z.string().min(1, 'Data intervento obbligatoria'),
  ora: z.string().min(1, 'Ora obbligatoria'),
  tipologiaIntervento: z.enum(TIPOLOGIA_INTERVENTO_VALUES, {
    message: 'Seleziona una tipologia intervento',
  }),
  tipoStufa: z.enum(['pellet', 'legno']),
  marca: req,
  modello: req,
  numeroSerie: optStr,
  dataAcquisto: optStr,
  rivenditore: optStr,
  tipoIntervento: optStr,
  motivoChiamata: req,
  codiceErrore: optStr,
  verifiche: optStr,
  installazioneEseguitaDa: optStr,
  descrizione: optStr,
  controlloGaranzia: controlloGaranziaSchema,
  presaVisioneCondizioniGaranzia: z
    .boolean()
    .refine((v) => v === true, 'Conferma la presa visione delle condizioni di garanzia'),
  tipologiaInstallazione: z.enum(TIPOLOGIA_INSTALLAZIONE_VALUES).optional(),
  noteInstallazione: optStr,
  prossimoIntervento: optStr,
  materialiUtilizzati: optStr,
  note: optStr,
  firmaClientePrivacy: firmaReq,
  firmaOperatore: firmaReq,
  firmaCliente: firmaReq,
});

export const rapportinoFormValuesSchema = z.object({
  operatore: operatoreSchema,
  cliente: clienteSchema,
  intervento: interventoSchema,
});

export type RapportinoFormValues = z.infer<typeof rapportinoFormValuesSchema>;

export const RAPPORTINO_FORM_STEPS = 5;

export const rapportinoStep1Schema = rapportinoFormValuesSchema.pick({ operatore: true });
export const rapportinoStep2Schema = rapportinoFormValuesSchema.pick({ intervento: true }).extend({
  intervento: interventoSchema.pick({
    tipologiaIntervento: true,
    dataRichiesta: true,
    data: true,
    ora: true,
  }),
});
export const rapportinoStep3Schema = rapportinoFormValuesSchema.pick({ cliente: true });
export const rapportinoStep4Schema = rapportinoFormValuesSchema.pick({ intervento: true }).extend({
  intervento: interventoSchema.omit({
    tipologiaIntervento: true,
    dataRichiesta: true,
    data: true,
    ora: true,
    firmaClientePrivacy: true,
    firmaOperatore: true,
    firmaCliente: true,
  }),
});
export const rapportinoStep5Schema = rapportinoFormValuesSchema.pick({ intervento: true }).extend({
  intervento: interventoSchema.pick({
    prossimoIntervento: true,
    firmaClientePrivacy: true,
    firmaOperatore: true,
    firmaCliente: true,
  }),
});

const defaultControlloGaranzia = {
  spiegataManutenzione: undefined,
  impiantoElettrico: undefined,
  condottoFumi: undefined,
  installazioneUni10683: undefined,
  controlloParametri: undefined,
};

export function getDefaultRapportinoFormValues(initial?: Rapportino): RapportinoFormValues {
  return {
    operatore: initial?.operatore ?? {
      nome: '',
      cognome: '',
      telefono: '',
      email: '',
      qualifica: '',
    },
    cliente: initial?.cliente
      ? {
          ...initial.cliente,
          via: initial.cliente.via ?? '',
          numeroCivico: initial.cliente.numeroCivico ?? '',
          provincia: initial.cliente.provincia ?? '',
          ragioneSociale: initial.cliente.ragioneSociale ?? '',
          cap: initial.cliente.cap ?? '',
          email: initial.cliente.email ?? '',
          partitaIva: initial.cliente.partitaIva ?? '',
          codiceFiscale: initial.cliente.codiceFiscale ?? '',
        }
      : {
          nome: '',
          cognome: '',
          ragioneSociale: '',
          via: '',
          numeroCivico: '',
          indirizzo: '',
          citta: '',
          cap: '',
          provincia: '',
          telefono: '',
          email: '',
          partitaIva: '',
          codiceFiscale: '',
        },
    intervento: initial?.intervento
      ? {
          dataRichiesta: initial.intervento.dataRichiesta ?? '',
          data: initial.intervento.data,
          ora: initial.intervento.ora,
          tipologiaIntervento:
            initial.intervento.tipologiaIntervento ?? 'manutenzione_annuale',
          tipoStufa: initial.intervento.tipoStufa,
          marca: initial.intervento.marca,
          modello: initial.intervento.modello,
          numeroSerie: initial.intervento.numeroSerie ?? '',
          dataAcquisto: initial.intervento.dataAcquisto ?? '',
          rivenditore: initial.intervento.rivenditore ?? '',
          tipoIntervento: initial.intervento.tipoIntervento ?? '',
          motivoChiamata:
            initial.intervento.motivoChiamata || initial.intervento.descrizione || '',
          codiceErrore: initial.intervento.codiceErrore ?? '',
          verifiche: initial.intervento.verifiche ?? '',
          installazioneEseguitaDa: initial.intervento.installazioneEseguitaDa ?? '',
          descrizione: initial.intervento.descrizione ?? '',
          controlloGaranzia: {
            ...defaultControlloGaranzia,
            ...initial.intervento.controlloGaranzia,
          },
          presaVisioneCondizioniGaranzia: initial.intervento.presaVisioneCondizioniGaranzia ?? false,
          tipologiaInstallazione: initial.intervento.tipologiaInstallazione,
          noteInstallazione: initial.intervento.noteInstallazione ?? '',
          prossimoIntervento: initial.intervento.prossimoIntervento ?? '',
          materialiUtilizzati: initial.intervento.materialiUtilizzati ?? '',
          note: initial.intervento.note ?? '',
          firmaClientePrivacy: initial.intervento.firmaClientePrivacy ?? '',
          firmaOperatore: initial.intervento.firmaOperatore ?? '',
          firmaCliente: initial.intervento.firmaCliente ?? '',
        }
      : {
          dataRichiesta: format(new Date(), 'yyyy-MM-dd'),
          data: format(new Date(), 'yyyy-MM-dd'),
          ora: format(new Date(), 'HH:mm'),
          tipologiaIntervento: 'manutenzione_annuale',
          tipoStufa: 'pellet',
          marca: '',
          modello: '',
          numeroSerie: '',
          dataAcquisto: '',
          rivenditore: '',
          tipoIntervento: '',
          motivoChiamata: '',
          codiceErrore: '',
          verifiche: '',
          installazioneEseguitaDa: '',
          descrizione: '',
          controlloGaranzia: defaultControlloGaranzia,
          presaVisioneCondizioniGaranzia: false,
          noteInstallazione: '',
          prossimoIntervento: '',
          materialiUtilizzati: '',
          note: '',
          firmaClientePrivacy: '',
          firmaOperatore: '',
          firmaCliente: '',
        },
  };
}

const RAPPORTINO_FIELD_LABELS: Record<string, string> = {
  'operatore.nome': 'Nome operatore',
  'operatore.cognome': 'Cognome operatore',
  'operatore.telefono': 'Telefono operatore',
  'operatore.qualifica': 'Qualifica operatore',
  'cliente.nome': 'Nome cliente',
  'cliente.cognome': 'Cognome cliente',
  'cliente.via': 'Via cliente',
  'cliente.citta': 'Località cliente',
  'cliente.telefono': 'Telefono cliente',
  'intervento.data': 'Data intervento',
  'intervento.ora': 'Ora intervento',
  'intervento.tipologiaIntervento': 'Tipologia intervento',
  'intervento.marca': 'Marca',
  'intervento.modello': 'Modello',
  'intervento.motivoChiamata': 'Motivo della chiamata',
  'intervento.presaVisioneCondizioniGaranzia': 'Presa visione condizioni garanzia',
  'intervento.firmaClientePrivacy': 'Firma privacy cliente',
  'intervento.firmaOperatore': 'Firma operatore',
  'intervento.firmaCliente': 'Firma cliente',
};

const OPERATORE_FIELDS = new Set(['nome', 'cognome', 'telefono', 'email', 'qualifica']);
const CLIENTE_FIELDS = new Set([
  'nome',
  'cognome',
  'ragioneSociale',
  'via',
  'numeroCivico',
  'indirizzo',
  'citta',
  'cap',
  'provincia',
  'telefono',
  'email',
  'partitaIva',
  'codiceFiscale',
]);
const INTERVENTO_STEP2_FIELDS = new Set(['tipologiaIntervento', 'dataRichiesta', 'data', 'ora']);
const INTERVENTO_STEP5_FIELDS = new Set([
  'firmaClientePrivacy',
  'firmaOperatore',
  'firmaCliente',
  'prossimoIntervento',
]);

function labelForIssuePath(path: ReadonlyArray<PropertyKey>): string {
  const pathKey = path.map(String).join('.');
  if (RAPPORTINO_FIELD_LABELS[pathKey]) return RAPPORTINO_FIELD_LABELS[pathKey];

  if (path.length === 1) {
    const field = String(path[0]);
    const operatoreKey = `operatore.${field}`;
    if (OPERATORE_FIELDS.has(field) && RAPPORTINO_FIELD_LABELS[operatoreKey]) {
      return RAPPORTINO_FIELD_LABELS[operatoreKey];
    }
    const clienteKey = `cliente.${field}`;
    if (CLIENTE_FIELDS.has(field) && RAPPORTINO_FIELD_LABELS[clienteKey]) {
      return RAPPORTINO_FIELD_LABELS[clienteKey];
    }
    const interventoKey = `intervento.${field}`;
    if (RAPPORTINO_FIELD_LABELS[interventoKey]) return RAPPORTINO_FIELD_LABELS[interventoKey];
  }

  return pathKey.replace(/\./g, ' › ');
}

export function getRapportinoIssueStep(path: ReadonlyArray<PropertyKey>): number {
  const root = String(path[0] ?? '');
  const field = String(path[1] ?? path[0] ?? '');

  if (root === 'operatore' || (path.length === 1 && OPERATORE_FIELDS.has(root))) return 1;
  if (root === 'cliente' || (path.length === 1 && CLIENTE_FIELDS.has(root))) return 3;
  if (root === 'intervento' || path.length === 1) {
    if (INTERVENTO_STEP2_FIELDS.has(field)) return 2;
    if (INTERVENTO_STEP5_FIELDS.has(field)) return 5;
    if (root === 'intervento' || path.length === 1) return 4;
  }
  return 1;
}

export function formatRapportinoValidationError(error: z.ZodError, maxIssues = 4): string {
  const issues = error.issues;
  if (issues.length === 0) return 'Dati non validi';

  const parts = issues.slice(0, maxIssues).map((issue) => {
    const label = labelForIssuePath(issue.path);
    const step = getRapportinoIssueStep(issue.path);
    const stepHint = step > 0 ? ` (step ${step})` : '';
    return `${label}${stepHint}: ${issue.message}`;
  });

  const suffix = issues.length > maxIssues ? ` (+${issues.length - maxIssues} altri)` : '';
  if (parts.length === 1) return parts[0];
  return `Campi da verificare: ${parts.join('; ')}${suffix}`;
}

export function firstIssueMessage(error: z.ZodError): string {
  return formatRapportinoValidationError(error, 1);
}
