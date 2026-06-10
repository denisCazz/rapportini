import type { Cliente } from '@/types';
import type { RapportinoFormValues } from '@/lib/validators/rapportino-form';
import { getDefaultRapportinoFormValues } from '@/lib/validators/rapportino-form';

type ClienteRow = {
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
};

type InterventoPrefillRow = {
  id: string;
  titolo: string;
  descrizione: string | null;
  data_pianificata: Date;
  ora_pianificata: Date | null;
  stato: string;
  clienti: ClienteRow | null;
};

export function mapClienteRowToForm(cliente: ClienteRow): RapportinoFormValues['cliente'] {
  return {
    nome: cliente.nome,
    cognome: cliente.cognome,
    ragioneSociale: cliente.ragione_sociale || '',
    via: cliente.via || '',
    numeroCivico: cliente.numero_civico || '',
    indirizzo: cliente.indirizzo,
    citta: cliente.citta,
    cap: cliente.cap,
    provincia: cliente.provincia || '',
    telefono: cliente.telefono,
    email: cliente.email || '',
    partitaIva: cliente.partita_iva || '',
    codiceFiscale: cliente.codice_fiscale || '',
  };
}

export function mapClienteRowToCliente(cliente: ClienteRow): Cliente {
  return mapClienteRowToForm(cliente);
}

export function buildRapportinoPrefillFromIntervento(
  row: InterventoPrefillRow
): Partial<RapportinoFormValues> {
  const defaults = getDefaultRapportinoFormValues();
  const data = row.data_pianificata.toISOString().slice(0, 10);
  const ora = row.ora_pianificata
    ? row.ora_pianificata.toISOString().slice(11, 16)
    : defaults.intervento.ora;

  const motivoParts = [row.titolo.trim()];
  if (row.descrizione?.trim()) {
    motivoParts.push(row.descrizione.trim());
  }

  const prefill: Partial<RapportinoFormValues> = {
    intervento: {
      ...defaults.intervento,
      data,
      ora,
      motivoChiamata: motivoParts.join(' — '),
      note: row.descrizione?.trim() || '',
    },
  };

  if (row.clienti) {
    prefill.cliente = mapClienteRowToForm(row.clienti);
  }

  return prefill;
}

export function canAccessInterventoPianificato(
  row: { utente_id: string | null; creato_da: string | null },
  user: { id: string; ruolo: string }
): boolean {
  if (user.ruolo === 'admin') return true;
  if (!row.utente_id || row.utente_id === user.id) return true;
  if (row.creato_da === user.id) return true;
  return false;
}
