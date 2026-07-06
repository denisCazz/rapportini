import { decimalToNumber } from '@/lib/planner';

export function mapClienteContatto(row: {
  id: string;
  nome: string;
  ruolo: string | null;
  telefono: string | null;
  email: string | null;
  principale: boolean;
  created_at: Date | null;
}) {
  return {
    id: row.id,
    nome: row.nome,
    ruolo: row.ruolo || undefined,
    telefono: row.telefono || undefined,
    email: row.email || undefined,
    principale: row.principale,
    createdAt: row.created_at?.toISOString() || undefined,
  };
}

export function mapClienteNota(row: {
  id: string;
  testo: string;
  created_at: Date | null;
  utente_id: string | null;
}) {
  return {
    id: row.id,
    testo: row.testo,
    createdAt: row.created_at?.toISOString() || '',
    utenteId: row.utente_id || undefined,
  };
}

export function mapPlannerClienteListItem(cliente: {
  id: string;
  nome: string;
  cognome: string;
  citta: string;
  telefono: string;
  email: string | null;
  indirizzo: string;
  lat: unknown;
  lng: unknown;
  _count?: { rapportini: number; contatti: number; note_crm: number };
}) {
  return {
    id: cliente.id,
    nome: cliente.nome,
    cognome: cliente.cognome,
    citta: cliente.citta,
    telefono: cliente.telefono,
    email: cliente.email || undefined,
    indirizzo: cliente.indirizzo,
    haCoordinate: decimalToNumber(cliente.lat) != null && decimalToNumber(cliente.lng) != null,
    totaleRapportini: cliente._count?.rapportini ?? 0,
    totaleContatti: cliente._count?.contatti ?? 0,
    totaleNote: cliente._count?.note_crm ?? 0,
  };
}

export function mapPlannerClienteDettaglio(
  cliente: {
    id: string;
    nome: string;
    cognome: string;
    ragione_sociale: string | null;
    via: string | null;
    numero_civico: string | null;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string | null;
    telefono: string;
    email: string | null;
    partita_iva: string | null;
    codice_fiscale: string | null;
    lat: unknown;
    lng: unknown;
    geocoded_at: Date | null;
    created_at: Date | null;
  },
  extras: {
    contatti: ReturnType<typeof mapClienteContatto>[];
    note: ReturnType<typeof mapClienteNota>[];
    rapportini: Array<{
      id: string;
      dataIntervento: string;
      tipoIntervento: string;
      marca: string;
      modello: string;
      operatore: { nome: string; cognome: string };
    }>;
    interventiPianificati: Array<{
      id: string;
      titolo: string;
      dataPianificata: string;
      stato: string;
    }>;
  }
) {
  const lat = decimalToNumber(cliente.lat);
  const lng = decimalToNumber(cliente.lng);

  return {
    id: cliente.id,
    nome: cliente.nome,
    cognome: cliente.cognome,
    ragioneSociale: cliente.ragione_sociale || undefined,
    via: cliente.via || undefined,
    numeroCivico: cliente.numero_civico || undefined,
    indirizzo: cliente.indirizzo,
    citta: cliente.citta,
    cap: cliente.cap,
    provincia: cliente.provincia || undefined,
    telefono: cliente.telefono,
    email: cliente.email || undefined,
    partitaIva: cliente.partita_iva || undefined,
    codiceFiscale: cliente.codice_fiscale || undefined,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    geocodedAt: cliente.geocoded_at?.toISOString() || undefined,
    dataRegistrazione: cliente.created_at?.toISOString().slice(0, 10) || undefined,
    contatti: extras.contatti,
    note: extras.note,
    rapportini: extras.rapportini,
    interventiPianificati: extras.interventiPianificati,
  };
}
