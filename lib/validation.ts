import { z } from 'zod';
import {
  SI_NO_NC_VALUES,
  TIPOLOGIA_INSTALLAZIONE_VALUES,
  TIPOLOGIA_INTERVENTO_VALUES,
} from '@/lib/rapportino-constants';

// Schema per login
export const loginSchema = z.object({
  username: z.string().min(1, 'Username obbligatorio').max(50, 'Username troppo lungo'),
  password: z.string().min(1, 'Password obbligatoria').max(100, 'Password troppo lunga'),
  partita_iva: z.string().max(20).optional().or(z.literal('')),
  ragione_sociale: z.string().max(255).optional().or(z.literal('')),
});

// Schema per registrazione CAT (admin_cat)
export const registerCatSchema = z.object({
  ragione_sociale: z.string().min(1, 'Ragione sociale obbligatoria').max(255),
  partita_iva: z.string().min(11, 'Partita IVA non valida').max(20),
  indirizzo: z.string().min(1, 'Indirizzo obbligatorio').max(500),
  codice_fiscale: z.string().min(11, 'Codice fiscale obbligatorio').max(16),
  pec: z.string().email('PEC non valida').max(255),
  codice_destinatario_sdi: z
    .string()
    .min(6, 'Codice destinatario SDI obbligatorio')
    .max(7)
    .regex(/^[A-Z0-9]{6,7}$/i, 'Codice SDI non valido'),
  username: z.string().min(3, 'Username deve avere almeno 3 caratteri').max(50),
  password: z.string().min(6, 'Password deve avere almeno 6 caratteri').max(100),
  nome: z.string().min(1, 'Nome obbligatorio').max(100),
  cognome: z.string().min(1, 'Cognome obbligatorio').max(100),
  telefono: z.string().min(1, 'Telefono obbligatorio').max(20),
  email: z.string().email('Email non valida').optional().or(z.literal('')).or(z.literal(null)),
});

export const updateCatStatoSchema = z.object({
  org_id: z.string().min(1).max(100),
  stato: z.enum(['in_attesa', 'attivo', 'sospeso']),
});

// Schema per registrazione utente
export const registerSchema = z.object({
  username: z.string().min(3, 'Username deve avere almeno 3 caratteri').max(50, 'Username troppo lungo'),
  password: z.string().min(6, 'Password deve avere almeno 6 caratteri').max(100, 'Password troppo lunga'),
  nome: z.string().min(1, 'Nome obbligatorio').max(100, 'Nome troppo lungo'),
  cognome: z.string().min(1, 'Cognome obbligatorio').max(100, 'Cognome troppo lungo'),
  email: z.string().email('Email non valida').optional().or(z.literal('')).or(z.literal(null)),
  telefono: z.string().max(20, 'Telefono troppo lungo').optional().or(z.literal('')),
  qualifica: z.string().max(100, 'Qualifica troppo lunga').optional().or(z.literal('')),
  ruolo: z.enum(['admin', 'admin_cat', 'operatore']).default('operatore'),
  partita_iva: z.string().max(20).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.ruolo === 'operatore' && !data.qualifica?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['qualifica'],
      message: 'Qualifica obbligatoria per ruolo operatore',
    });
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

// Schema per cliente
export const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio').max(100, 'Nome troppo lungo'),
  cognome: z.string().min(1, 'Cognome obbligatorio').max(100, 'Cognome troppo lungo'),
  ragioneSociale: z.string().max(200, 'Ragione sociale troppo lunga').optional().or(z.literal('')),
  via: z.string().max(200, 'Via troppo lunga').optional().or(z.literal('')),
  numeroCivico: z.string().max(20, 'Numero civico troppo lungo').optional().or(z.literal('')),
  indirizzo: z.string().max(200, 'Indirizzo troppo lungo').optional().or(z.literal('')),
  citta: z.string().min(1, 'Località obbligatoria').max(100, 'Località troppo lunga'),
  cap: z.string().max(5, 'CAP non valido').optional().or(z.literal('')),
  provincia: z.string().max(10, 'Provincia troppo lunga').optional().or(z.literal('')),
  telefono: z.string().min(1, 'Telefono obbligatorio').max(20, 'Telefono troppo lungo'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  partitaIva: z.string().max(20, 'Partita IVA troppo lunga').optional().or(z.literal('')),
  codiceFiscale: z.string().max(20, 'Codice fiscale troppo lungo').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const hasVia = Boolean(data.via?.trim());
  const hasIndirizzo = Boolean(data.indirizzo?.trim());
  if (!hasVia && !hasIndirizzo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['via'],
      message: 'Via o indirizzo obbligatorio',
    });
  }
});

// Schema per intervento
export const interventoSchema = z.object({
  dataRichiesta: z.string().optional().or(z.literal('')),
  data: z.string().min(1, 'Data intervento obbligatoria'),
  ora: z.string().min(1, 'Ora obbligatoria'),
  tipologiaIntervento: z.enum(TIPOLOGIA_INTERVENTO_VALUES, {
    message: 'Tipologia intervento non valida',
  }).optional(),
  tipoStufa: z.enum(['pellet', 'legno'], { message: 'Tipo stufa deve essere pellet o legno' }),
  marca: z.string().min(1, 'Marca obbligatoria').max(100, 'Marca troppo lunga'),
  modello: z.string().min(1, 'Modello obbligatorio').max(100, 'Modello troppo lungo'),
  numeroSerie: z.string().max(100, 'Matricola troppo lunga').optional().or(z.literal('')),
  dataAcquisto: z.string().optional().or(z.literal('')),
  rivenditore: z.string().max(200, 'Rivenditore troppo lungo').optional().or(z.literal('')),
  tipoIntervento: z.string().max(100, 'Tipo intervento troppo lungo').optional().or(z.literal('')),
  motivoChiamata: z.string().max(2000, 'Motivo chiamata troppo lungo').optional().or(z.literal('')),
  codiceErrore: z.string().max(20, 'Codice errore troppo lungo').optional().or(z.literal('')),
  verifiche: z.string().max(2000, 'Verifiche troppo lunghe').optional().or(z.literal('')),
  installazioneEseguitaDa: z.string().max(200, 'Campo troppo lungo').optional().or(z.literal('')),
  descrizione: z.string().max(2000, 'Descrizione troppo lunga').optional().or(z.literal('')),
  controlloGaranzia: controlloGaranziaSchema.optional(),
  presaVisioneCondizioniGaranzia: z.boolean().optional(),
  tipologiaInstallazione: z.enum(TIPOLOGIA_INSTALLAZIONE_VALUES).optional(),
  noteInstallazione: z.string().max(2000, 'Note installazione troppo lunghe').optional().or(z.literal('')),
  prossimoIntervento: z.string().optional().or(z.literal('')),
  materialiUtilizzati: z.string().max(1000, 'Materiali troppo lunghi').optional().or(z.literal('')),
  note: z.string().max(1000, 'Note troppo lunghe').optional().or(z.literal('')),
  firmaClientePrivacy: z.string().optional().or(z.literal('')),
  firmaOperatore: z.string().optional().or(z.literal('')),
  firmaCliente: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (!data.tipologiaIntervento && !data.tipoIntervento?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tipologiaIntervento'],
      message: 'Tipologia intervento obbligatoria',
    });
  }
  if (!data.motivoChiamata?.trim() && !data.descrizione?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['motivoChiamata'],
      message: 'Motivo della chiamata obbligatorio',
    });
  }
});

// Schema per rapportino completo
export const rapportinoSchema = z.object({
  cliente: clienteSchema,
  intervento: interventoSchema,
});

/** Body POST catalogo marche / modelli (nome testuale) */
export const catalogNomeBodySchema = z.object({
  nome: z.string().trim().min(1, 'Nome obbligatorio').max(120, 'Nome troppo lungo'),
});

export const modelloCreateBodySchema = catalogNomeBodySchema.extend({
  marca_id: z.string().uuid('ID marca non valido'),
});

// Schema per ricerca clienti
export const searchClienteSchema = z.object({
  q: z.string().min(1, 'Query di ricerca obbligatoria').max(100, 'Query troppo lunga'),
});

// Schema per filtri rapportini
export const rapportiniFilterSchema = z.object({
  tipoStufa: z.enum(['pellet', 'legno']).optional(),
  dataInizio: z.string().optional(),
  dataFine: z.string().optional(),
  marca: z.string().optional(),
  modello: z.string().optional(),
  clienteId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});

// Schema per aggiornamento utente
export const updateUserSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  cognome: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  qualifica: z.string().max(100).optional().or(z.literal('')),
  firma: z.string().max(3000000).optional().or(z.literal('')),
  attivo: z.boolean().optional(),
  ruolo: z.enum(['admin', 'admin_cat', 'operatore']).optional(),
});

// Schema per cambio password
export const changePasswordSchema = z.object({
  currentPassword: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().min(1, 'Password attuale obbligatoria')
  ),
  newPassword: z.string().min(8, 'Nuova password deve avere almeno 8 caratteri').max(100),
  confirmPassword: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().min(1, 'Conferma password obbligatoria')
  ),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
});

// Helper per validare e restituire errori formattati
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, errors };
}

// Helper per validare parametri query
export function validateQueryParams<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { success: true; data: T } | { success: false; errors: string[] } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return validateRequest(schema, params);
}
