import { format } from 'date-fns';
import { z } from 'zod';
import type { Rapportino } from '@/types';

const req = z.string().trim().min(1, 'Campo obbligatorio');
const optStr = z.string().optional();

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
  indirizzo: req,
  citta: req,
  cap: req,
  telefono: req,
  email: optStr,
  partitaIva: optStr,
  codiceFiscale: optStr,
});

export const interventoSchema = z.object({
  data: z.string().min(1),
  ora: z.string().min(1),
  tipoStufa: z.enum(['pellet', 'legno']),
  marca: req,
  modello: req,
  numeroSerie: optStr,
  tipoIntervento: req,
  descrizione: req,
  materialiUtilizzati: optStr,
  note: optStr,
  firmaOperatore: req,
  firmaCliente: req,
});

export const rapportinoFormValuesSchema = z.object({
  operatore: operatoreSchema,
  cliente: clienteSchema,
  intervento: interventoSchema,
});

export type RapportinoFormValues = z.infer<typeof rapportinoFormValuesSchema>;

export const rapportinoStep1Schema = rapportinoFormValuesSchema.pick({ operatore: true });
export const rapportinoStep2Schema = rapportinoFormValuesSchema.pick({ cliente: true });
export const rapportinoStep3Schema = rapportinoFormValuesSchema.pick({ intervento: true });

export function getDefaultRapportinoFormValues(initial?: Rapportino): RapportinoFormValues {
  return {
    operatore: initial?.operatore ?? {
      nome: '',
      cognome: '',
      telefono: '',
      email: '',
      qualifica: '',
    },
    cliente: initial?.cliente ?? {
      nome: '',
      cognome: '',
      ragioneSociale: '',
      indirizzo: '',
      citta: '',
      cap: '',
      telefono: '',
      email: '',
      partitaIva: '',
      codiceFiscale: '',
    },
    intervento: initial?.intervento
      ? {
          ...initial.intervento,
          firmaOperatore: initial.intervento.firmaOperatore ?? '',
          firmaCliente: initial.intervento.firmaCliente ?? '',
          numeroSerie: initial.intervento.numeroSerie ?? '',
          materialiUtilizzati: initial.intervento.materialiUtilizzati ?? '',
          note: initial.intervento.note ?? '',
        }
      : {
          data: format(new Date(), 'yyyy-MM-dd'),
          ora: format(new Date(), 'HH:mm'),
          tipoStufa: 'pellet',
          marca: '',
          modello: '',
          numeroSerie: '',
          tipoIntervento: 'Manutenzione',
          descrizione: '',
          materialiUtilizzati: '',
          note: '',
          firmaOperatore: '',
          firmaCliente: '',
        },
  };
}

export function firstIssueMessage(error: z.ZodError): string {
  const i = error.issues[0];
  return i?.message ?? 'Dati non validi';
}
