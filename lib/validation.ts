import { z } from 'zod';

// Schema per login
export const loginSchema = z.object({
  username: z.string().min(1, 'Username obbligatorio').max(50, 'Username troppo lungo'),
  password: z.string().min(1, 'Password obbligatoria').max(100, 'Password troppo lunga'),
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
  ruolo: z.enum(['admin', 'operatore']).default('operatore'),
});

// Schema per cliente
export const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio').max(100, 'Nome troppo lungo'),
  cognome: z.string().min(1, 'Cognome obbligatorio').max(100, 'Cognome troppo lungo'),
  ragioneSociale: z.string().max(200, 'Ragione sociale troppo lunga').optional().or(z.literal('')),
  indirizzo: z.string().min(1, 'Indirizzo obbligatorio').max(200, 'Indirizzo troppo lungo'),
  citta: z.string().min(1, 'Città obbligatoria').max(100, 'Città troppo lunga'),
  cap: z.string().min(5, 'CAP deve avere 5 caratteri').max(5, 'CAP deve avere 5 caratteri'),
  telefono: z.string().min(1, 'Telefono obbligatorio').max(20, 'Telefono troppo lungo'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  partitaIva: z.string().max(20, 'Partita IVA troppo lunga').optional().or(z.literal('')),
  codiceFiscale: z.string().max(20, 'Codice fiscale troppo lungo').optional().or(z.literal('')),
});

// Schema per intervento
export const interventoSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),
  ora: z.string().min(1, 'Ora obbligatoria'),
  tipoStufa: z.enum(['pellet', 'legno'], { message: 'Tipo stufa deve essere pellet o legno' }),
  marca: z.string().min(1, 'Marca obbligatoria').max(100, 'Marca troppo lunga'),
  modello: z.string().min(1, 'Modello obbligatorio').max(100, 'Modello troppo lungo'),
  numeroSerie: z.string().max(100, 'Numero serie troppo lungo').optional().or(z.literal('')),
  tipoIntervento: z.string().min(1, 'Tipo intervento obbligatorio').max(100, 'Tipo intervento troppo lungo'),
  descrizione: z.string().min(1, 'Descrizione obbligatoria').max(2000, 'Descrizione troppo lunga'),
  materialiUtilizzati: z.string().max(1000, 'Materiali troppo lunghi').optional().or(z.literal('')),
  note: z.string().max(1000, 'Note troppo lunghe').optional().or(z.literal('')),
  firmaCliente: z.string().optional().or(z.literal('')),
});

// Schema per rapportino completo
export const rapportinoSchema = z.object({
  cliente: clienteSchema,
  intervento: interventoSchema,
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
  attivo: z.boolean().optional(),
  ruolo: z.enum(['admin', 'operatore']).optional(),
});

// Schema per cambio password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password attuale obbligatoria'),
  newPassword: z.string().min(8, 'Nuova password deve avere almeno 8 caratteri').max(100),
  confirmPassword: z.string().min(1, 'Conferma password obbligatoria'),
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
