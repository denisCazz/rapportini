import type {
  SiNoNc,
  TipologiaInstallazione,
  TipologiaIntervento,
} from '@/lib/rapportino-constants';

export type { SiNoNc, TipologiaInstallazione, TipologiaIntervento };

export interface Operatore {
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
  qualifica: string;
}

export interface Cliente {
  nome: string;
  cognome: string;
  ragioneSociale?: string;
  via?: string;
  numeroCivico?: string;
  indirizzo?: string;
  citta: string;
  cap?: string;
  provincia?: string;
  telefono: string;
  email?: string;
  partitaIva?: string;
  codiceFiscale?: string;
}

export interface ControlloGaranzia {
  spiegataManutenzione?: SiNoNc;
  impiantoElettrico?: SiNoNc;
  condottoFumi?: SiNoNc;
  installazioneUni10683?: SiNoNc;
  controlloParametri?: SiNoNc;
}

export interface Intervento {
  dataRichiesta?: string;
  data: string;
  ora: string;
  tipologiaIntervento?: TipologiaIntervento;
  tipoStufa: 'pellet' | 'legno';
  marca: string;
  modello: string;
  numeroSerie?: string;
  dataAcquisto?: string;
  rivenditore?: string;
  tipoIntervento?: string;
  motivoChiamata?: string;
  codiceErrore?: string;
  verifiche?: string;
  installazioneEseguitaDa?: string;
  descrizione?: string;
  controlloGaranzia?: ControlloGaranzia;
  presaVisioneCondizioniGaranzia?: boolean;
  tipologiaInstallazione?: TipologiaInstallazione;
  noteInstallazione?: string;
  prossimoIntervento?: string;
  materialiUtilizzati?: string;
  note?: string;
  firmaClientePrivacy?: string;
  firmaOperatore?: string;
  firmaCliente?: string;
}

export interface RapportinoImmagine {
  id: string;
  storageKey: string;
  bucket: string;
  mimeType: string;
  sizeBytes?: number;
  caption?: string;
  archivedAt?: string;
  createdAt: string;
  /** URL API per visualizzazione (solo in risposte API) */
  url?: string;
}

export interface Rapportino {
  id: string;
  operatore: Operatore;
  cliente: Cliente;
  intervento: Intervento;
  dataCreazione: string;
  immagini?: RapportinoImmagine[];
}

export interface AziendaSettings {
  logo?: string;
  nomeAzienda?: string;
  darkMode?: boolean;
  indirizzo?: string;
  partitaIva?: string;
}

export interface ClienteAdminOperatore {
  id: string;
  nome: string;
  cognome: string;
  count: number;
}

export interface ClienteAdminRapportino {
  id: string;
  dataIntervento: string;
  tipoStufa: string;
  tipoIntervento: string;
  tipologiaIntervento: string;
  marca: string;
  modello: string;
  operatore: { id: string; nome: string; cognome: string };
}

export interface ClienteAdminStatistiche {
  totale: number;
  pellet: number;
  legno: number;
  ultimoIntervento: string | null;
  primoIntervento: string | null;
  tipiIntervento: Record<string, number>;
  marche: Record<string, number>;
}

export interface ClienteAdminDettaglio {
  id: string;
  nome: string;
  cognome: string;
  ragioneSociale: string;
  via: string;
  numeroCivico: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  telefono: string;
  email: string;
  partitaIva: string;
  codiceFiscale: string;
  dataRegistrazione: string | null;
}

export interface ClienteAdminEntry {
  cliente: ClienteAdminDettaglio;
  rapportini: ClienteAdminRapportino[];
  statistiche: ClienteAdminStatistiche;
  operatori: ClienteAdminOperatore[];
}

export interface ClientiAdminSummary {
  totaleClienti: number;
  totaleRapportini: number;
  totalePellet: number;
  totaleLegno: number;
  clientiConInterventoAnno: number;
  mediaRapportiniPerCliente: number;
  cittaPrincipali: Array<{ citta: string; count: number }>;
}

export interface ClientiAdminResponse {
  summary: ClientiAdminSummary;
  clienti: ClienteAdminEntry[];
}
