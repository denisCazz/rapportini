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
  indirizzo: string;
  citta: string;
  cap: string;
  telefono: string;
  email?: string;
  partitaIva?: string;
  codiceFiscale?: string;
}

export interface Intervento {
  data: string;
  ora: string;
  tipoStufa: 'pellet' | 'legno';
  marca: string;
  modello: string;
  numeroSerie?: string;
  tipoIntervento: string;
  descrizione: string;
  materialiUtilizzati?: string;
  note?: string;
  firmaCliente?: string;
}

export interface Rapportino {
  id: string;
  operatore: Operatore;
  cliente: Cliente;
  intervento: Intervento;
  dataCreazione: string;
}

export interface AziendaSettings {
  logo?: string; // base64 o URL
  nomeAzienda?: string;
  darkMode?: boolean;
}
