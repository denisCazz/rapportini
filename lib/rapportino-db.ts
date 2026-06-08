import type { Cliente, Intervento, Rapportino } from '@/types';
import type {
  SiNoNc,
  TipologiaInstallazione,
  TipologiaIntervento,
} from '@/lib/rapportino-constants';
import { TIPOLOGIA_INTERVENTO_LABELS } from '@/lib/rapportino-constants';
import { parseDateOnly, parseTimeForDb } from '@/lib/time-db';

type RapportinoDbRow = {
  id: string;
  data_intervento: Date;
  ora_intervento: Date;
  data_richiesta?: Date | null;
  tipologia_intervento?: string | null;
  tipo_stufa: string;
  marca: string;
  modello: string;
  numero_serie: string | null;
  data_acquisto?: Date | null;
  rivenditore?: string | null;
  tipo_intervento: string;
  motivo_chiamata?: string | null;
  verifiche?: string | null;
  installazione_eseguita_da?: string | null;
  descrizione: string;
  spiegata_manutenzione?: string | null;
  impianto_elettrico?: string | null;
  condotto_fumi?: string | null;
  installazione_uni10683?: string | null;
  controllo_parametri?: string | null;
  presa_visione_condizioni_garanzia?: boolean | null;
  tipologia_installazione?: string | null;
  note_installazione?: string | null;
  prossimo_intervento?: Date | null;
  materiali_utilizzati: string | null;
  note: string | null;
  firma_cliente_privacy?: string | null;
  firma_operatore: string | null;
  firma_cliente: string | null;
  data_creazione: Date | null;
  created_at: Date | null;
  utenti: {
    nome: string;
    cognome: string;
    telefono: string | null;
    email: string | null;
    qualifica: string | null;
  } | null;
  clienti: {
    nome: string;
    cognome: string;
    ragione_sociale: string | null;
    via?: string | null;
    numero_civico?: string | null;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia?: string | null;
    telefono: string;
    email: string | null;
    partita_iva: string | null;
    codice_fiscale: string | null;
  };
};

function formatOra(ora: Date | string): string {
  if (typeof ora === 'string') return ora;
  return ora.toISOString().slice(11, 19);
}

function formatData(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

function parseSiNoNc(value: string | null | undefined): SiNoNc | undefined {
  if (value === 'si' || value === 'no' || value === 'nc') return value;
  return undefined;
}

export function buildClienteIndirizzo(cliente: Cliente): string {
  const via = cliente.via?.trim();
  const civico = cliente.numeroCivico?.trim();
  if (via) {
    return [via, civico].filter(Boolean).join(' ').trim();
  }
  return cliente.indirizzo?.trim() || '';
}

export function mapDbClienteToCliente(clienti: RapportinoDbRow['clienti']): Cliente {
  return {
    nome: clienti.nome,
    cognome: clienti.cognome,
    ragioneSociale: clienti.ragione_sociale || '',
    via: clienti.via || '',
    numeroCivico: clienti.numero_civico || '',
    indirizzo: clienti.indirizzo,
    citta: clienti.citta,
    cap: clienti.cap,
    provincia: clienti.provincia || '',
    telefono: clienti.telefono,
    email: clienti.email || '',
    partitaIva: clienti.partita_iva || '',
    codiceFiscale: clienti.codice_fiscale || '',
  };
}

export function mapDbRowToRapportino(r: RapportinoDbRow): Rapportino {
  const tipologia = r.tipologia_intervento as TipologiaIntervento | null | undefined;

  return {
    id: r.id,
    operatore: {
      nome: r.utenti?.nome || '',
      cognome: r.utenti?.cognome || '',
      telefono: r.utenti?.telefono || '',
      email: r.utenti?.email || '',
      qualifica: r.utenti?.qualifica || '',
    },
    cliente: mapDbClienteToCliente(r.clienti),
    intervento: {
      dataRichiesta: formatData(r.data_richiesta),
      data: formatData(r.data_intervento) || '',
      ora: formatOra(r.ora_intervento),
      tipologiaIntervento: tipologia || undefined,
      tipoStufa: r.tipo_stufa as 'pellet' | 'legno',
      marca: r.marca,
      modello: r.modello,
      numeroSerie: r.numero_serie || '',
      dataAcquisto: formatData(r.data_acquisto),
      rivenditore: r.rivenditore || '',
      tipoIntervento: r.tipo_intervento,
      motivoChiamata: r.motivo_chiamata || '',
      verifiche: r.verifiche || '',
      installazioneEseguitaDa: r.installazione_eseguita_da || '',
      descrizione: r.descrizione,
      controlloGaranzia: {
        spiegataManutenzione: parseSiNoNc(r.spiegata_manutenzione),
        impiantoElettrico: parseSiNoNc(r.impianto_elettrico),
        condottoFumi: parseSiNoNc(r.condotto_fumi),
        installazioneUni10683: parseSiNoNc(r.installazione_uni10683),
        controlloParametri: parseSiNoNc(r.controllo_parametri),
      },
      presaVisioneCondizioniGaranzia: r.presa_visione_condizioni_garanzia ?? false,
      tipologiaInstallazione: (r.tipologia_installazione as TipologiaInstallazione) || undefined,
      noteInstallazione: r.note_installazione || '',
      prossimoIntervento: formatData(r.prossimo_intervento),
      materialiUtilizzati: r.materiali_utilizzati || '',
      note: r.note || '',
      firmaClientePrivacy: r.firma_cliente_privacy || '',
      firmaOperatore: r.firma_operatore || '',
      firmaCliente: r.firma_cliente || '',
    },
    dataCreazione: (r.data_creazione || r.created_at || new Date()).toISOString(),
  };
}

export function mapInterventoToDbData(intervento: Intervento) {
  const tipologia = intervento.tipologiaIntervento;
  const tipoInterventoLabel = tipologia
    ? TIPOLOGIA_INTERVENTO_LABELS[tipologia]
    : intervento.tipoIntervento || intervento.motivoChiamata || 'Intervento';

  return {
    data_richiesta: intervento.dataRichiesta ? parseDateOnly(intervento.dataRichiesta) : null,
    data_intervento: parseDateOnly(intervento.data),
    ora_intervento: parseTimeForDb(intervento.ora),
    tipologia_intervento: tipologia || null,
    tipo_stufa: intervento.tipoStufa,
    marca: intervento.marca,
    modello: intervento.modello,
    numero_serie: intervento.numeroSerie?.trim() || null,
    data_acquisto: intervento.dataAcquisto ? parseDateOnly(intervento.dataAcquisto) : null,
    rivenditore: intervento.rivenditore?.trim() || null,
    tipo_intervento: tipoInterventoLabel,
    motivo_chiamata: intervento.motivoChiamata?.trim() || null,
    verifiche: intervento.verifiche?.trim() || null,
    installazione_eseguita_da: intervento.installazioneEseguitaDa?.trim() || null,
    descrizione: intervento.descrizione || intervento.motivoChiamata?.trim() || '',
    spiegata_manutenzione: intervento.controlloGaranzia?.spiegataManutenzione || null,
    impianto_elettrico: intervento.controlloGaranzia?.impiantoElettrico || null,
    condotto_fumi: intervento.controlloGaranzia?.condottoFumi || null,
    installazione_uni10683: intervento.controlloGaranzia?.installazioneUni10683 || null,
    controllo_parametri: intervento.controlloGaranzia?.controlloParametri || null,
    presa_visione_condizioni_garanzia: intervento.presaVisioneCondizioniGaranzia ?? false,
    tipologia_installazione: intervento.tipologiaInstallazione || null,
    note_installazione: intervento.noteInstallazione?.trim() || null,
    prossimo_intervento: intervento.prossimoIntervento
      ? parseDateOnly(intervento.prossimoIntervento)
      : null,
    materiali_utilizzati: intervento.materialiUtilizzati?.trim() || null,
    note: intervento.note?.trim() || null,
    firma_cliente_privacy: intervento.firmaClientePrivacy?.trim() || null,
    firma_operatore: intervento.firmaOperatore?.trim() || null,
    firma_cliente: intervento.firmaCliente?.trim() || null,
  };
}

export function mapClienteToDbData(cliente: Cliente, orgId: string) {
  const indirizzo = buildClienteIndirizzo(cliente);

  return {
    org_id: orgId,
    nome: cliente.nome.trim(),
    cognome: cliente.cognome.trim(),
    ragione_sociale: cliente.ragioneSociale?.trim() || null,
    via: cliente.via?.trim() || null,
    numero_civico: cliente.numeroCivico?.trim() || null,
    indirizzo,
    citta: cliente.citta.trim(),
    cap: cliente.cap?.trim() || '00000',
    provincia: cliente.provincia?.trim() || null,
    telefono: cliente.telefono.trim(),
    email: cliente.email?.trim() || null,
    partita_iva: cliente.partitaIva?.trim() || null,
    codice_fiscale: cliente.codiceFiscale?.trim() || null,
  };
}
