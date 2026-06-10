import type { InterventoPianificato, StatoInterventoPianificato } from '@/types';

type InterventoPianificatoRow = {
  id: string;
  titolo: string;
  descrizione: string | null;
  data_pianificata: Date;
  ora_pianificata: Date | null;
  stato: string;
  clienti: {
    id: string;
    nome: string;
    cognome: string;
    citta: string;
    telefono: string;
  } | null;
  utenti: {
    id: string;
    nome: string;
    cognome: string;
  } | null;
};

function formatOra(ora: Date | null): string | undefined {
  if (!ora) return undefined;
  return ora.toISOString().slice(11, 16);
}

function formatData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function mapInterventoPianificato(row: InterventoPianificatoRow): InterventoPianificato {
  return {
    id: row.id,
    titolo: row.titolo,
    descrizione: row.descrizione || undefined,
    dataPianificata: formatData(row.data_pianificata),
    oraPianificata: formatOra(row.ora_pianificata),
    stato: row.stato as StatoInterventoPianificato,
    cliente: row.clienti
      ? {
          id: row.clienti.id,
          nome: row.clienti.nome,
          cognome: row.clienti.cognome,
          citta: row.clienti.citta,
          telefono: row.clienti.telefono,
        }
      : undefined,
    tecnico: row.utenti
      ? {
          id: row.utenti.id,
          nome: row.utenti.nome,
          cognome: row.utenti.cognome,
        }
      : undefined,
  };
}
