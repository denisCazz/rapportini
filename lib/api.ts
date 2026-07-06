import {
  Rapportino,
  RapportinoImmagine,
  AziendaSettings,
  ClientiAdminResponse,
  EventoCalendario,
  InterventoPianificato,
  ScadenzaManutenzione,
  TecnicoCaricoLavoro,
  PlannerPercorso,
  PlannerClienteListItem,
  PlannerClienteDettaglio,
  ClienteNotaCrm,
  ClienteContattoCrm,
} from '@/types';
import type { RapportinoFormValues } from '@/lib/validators/rapportino-form';
import { auth } from './auth';
import { fetchWithAuth, getApiErrorMessage, getAuthHeaders, parseResponseBody } from './api-helpers';

const API_BASE = '/api';

// Re-export per uso in altri moduli
export { parseResponseBody, fetchWithAuth, getApiErrorMessage } from './api-helpers';
export { getAuthHeaders } from './api-helpers';

// Interfaccia per i filtri rapportini
export interface RapportiniFilters {
  tipoStufa?: 'pellet' | 'legno';
  dataInizio?: string;
  dataFine?: string;
  marca?: string;
  modello?: string;
  clienteId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RapportiniSummary {
  total: number;
  pellet: number;
  legno: number;
}

export interface AdminStatisticsResponse {
  clienti: Array<{
    cliente: {
      id: string;
      nome: string;
      cognome: string;
      ragioneSociale: string;
      indirizzo: string;
      citta: string;
      cap: string;
      telefono: string;
      email: string;
    };
    rapportini: Array<{
      id: string;
      dataIntervento: string;
      tipoStufa: string;
      tipoIntervento: string;
    }>;
    statistiche: {
      totale: number;
      pellet: number;
      legno: number;
      ultimoIntervento: string | null;
      primoIntervento: string | null;
      tipiIntervento: Record<string, number>;
    };
  }>;
  trendMensile: Array<{ month: string; pellet: number; legno: number }>;
}

// Interfaccia per la risposta paginata
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Helper per costruire query string
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const api = {
  // Ottieni tutti i rapportini (filtrati per utente se operatore)
  getRapportini: async (filters?: RapportiniFilters): Promise<Rapportino[]> => {
    const headers = getAuthHeaders();
    const queryString = filters ? buildQueryString(filters) : '';
    const response = await fetchWithAuth(`${API_BASE}/rapportini${queryString}`, {
      headers,
    });
    const result = await parseResponseBody<{ data?: Rapportino[]; error?: string } | Rapportino[]>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero dei rapportini'));
    }
    // Supporta sia la vecchia risposta (array) che la nuova (paginata)
    return Array.isArray(result) ? result : (result?.data ?? []);
  },

  // Ottieni rapportini con paginazione
  getRapportiniPaginated: async (filters?: RapportiniFilters): Promise<PaginatedResponse<Rapportino>> => {
    const headers = getAuthHeaders();
    const queryString = filters ? buildQueryString(filters) : '';
    const response = await fetchWithAuth(`${API_BASE}/rapportini${queryString}`, {
      headers,
    });
    const result = await parseResponseBody<PaginatedResponse<Rapportino> & { error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero dei rapportini'));
    }
    return result as PaginatedResponse<Rapportino>;
  },

  // Crea un nuovo rapportino
  createRapportino: async (rapportino: Rapportino): Promise<{ id: string; success: boolean }> => {
    const user = auth.getUser();
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    const response = await fetchWithAuth(`${API_BASE}/rapportini`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rapportino,
        userId: user.id,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nella creazione del rapportino');
    }
    return response.json();
  },

  // Ottieni un singolo rapportino per ID
  getRapportino: async (id: string): Promise<Rapportino> => {
    const headers = getAuthHeaders();
    const response = await fetchWithAuth(`${API_BASE}/rapportini/${id}`, {
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nel recupero del rapportino');
    }
    return response.json();
  },

  // Modifica un rapportino esistente
  updateRapportino: async (id: string, rapportino: Rapportino): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/rapportini/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rapportino }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nella modifica del rapportino');
    }
  },

  // Immagini rapportino (opzionali)
  getRapportinoImmagini: async (rapportinoId: string): Promise<RapportinoImmagine[]> => {
    const response = await fetchWithAuth(`${API_BASE}/rapportini/${rapportinoId}/immagini`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nel recupero immagini');
    }
    const result = await response.json();
    return result.data;
  },

  uploadRapportinoImmagine: async (rapportinoId: string, file: File, caption?: string): Promise<RapportinoImmagine> => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    const response = await fetchWithAuth(`${API_BASE}/rapportini/${rapportinoId}/immagini`, {
      method: 'POST',
      headers: getAuthHeaders({ skipContentType: true }),
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nel caricamento immagine');
    }
    const result = await response.json();
    return result.data;
  },

  uploadRapportinoImmagini: async (rapportinoId: string, files: File[]): Promise<RapportinoImmagine[]> => {
    const results: RapportinoImmagine[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetchWithAuth(`${API_BASE}/rapportini/${rapportinoId}/immagini`, {
        method: 'POST',
        headers: getAuthHeaders({ skipContentType: true }),
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nel caricamento immagine');
      }
      const result = await response.json();
      results.push(result.data);
    }
    return results;
  },

  deleteRapportinoImmagine: async (rapportinoId: string, imageId: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/rapportini/${rapportinoId}/immagini/${imageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Errore nell'eliminazione immagine");
    }
  },

  // Elimina un rapportino
  deleteRapportino: async (id: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetchWithAuth(`${API_BASE}/rapportini/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nell\'eliminazione del rapportino');
    }
  },

  // KPI dashboard (conteggi globali, non limitati alla pagina corrente)
  getRapportiniSummary: async (): Promise<RapportiniSummary> => {
    const response = await fetchWithAuth(`${API_BASE}/rapportini/summary`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<RapportiniSummary & { error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero del riepilogo'));
    }
    return result as RapportiniSummary;
  },

  // Ottieni statistiche admin
  getStatistics: async (): Promise<AdminStatisticsResponse> => {
    const headers = getAuthHeaders();
    const response = await fetchWithAuth(`${API_BASE}/admin/statistics`, {
      headers,
    });
    const result = await parseResponseBody<AdminStatisticsResponse & { error?: string } | unknown[]>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero delle statistiche'));
    }
    // Retrocompatibilità: risposta legacy (array puro)
    if (Array.isArray(result)) {
      return { clienti: result as AdminStatisticsResponse['clienti'], trendMensile: [] };
    }
    return result as AdminStatisticsResponse;
  },

  // Ottieni elenco clienti con statistiche (admin)
  getClientiAdmin: async (): Promise<ClientiAdminResponse> => {
    const headers = getAuthHeaders();
    const response = await fetchWithAuth(`${API_BASE}/admin/clienti`, {
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nel recupero dei clienti');
    }
    return response.json();
  },

  // Invia email di conferma intervento
  sendInterventoEmail: async (rapportino: Rapportino, aziendaNome?: string): Promise<{ success: boolean; message: string }> => {
    const headers = getAuthHeaders();
    const response = await fetchWithAuth(`${API_BASE}/email/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rapportino, aziendaNome }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Errore nell\'invio dell\'email');
    }
    return result;
  },

  // Ottieni profilo utente
  getUserProfile: async (userId: string): Promise<{
    id: string;
    username: string;
    ruolo: string;
    nome: string;
    cognome: string;
    telefono: string | null;
    email: string | null;
    qualifica: string | null;
    firma: string | null;
    attivo: boolean;
  }> => {
    const response = await fetchWithAuth(`${API_BASE}/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{ data?: {
      id: string;
      username: string;
      ruolo: string;
      nome: string;
      cognome: string;
      telefono: string | null;
      email: string | null;
      qualifica: string | null;
      firma: string | null;
      attivo: boolean;
    }; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero del profilo'));
    }
    if (!result?.data) {
      throw new Error('Profilo non trovato');
    }
    return result.data;
  },

  // Cambia password (self-service)
  changePassword: async (
    userId: string,
    data: { currentPassword: string; newPassword: string; confirmPassword: string }
  ): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/users/${userId}/password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseResponseBody<{ error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel cambio password'));
    }
  },

  // Aggiorna utente (profilo, firma, ecc.)
  updateUser: async (userId: string, data: { firma?: string; nome?: string; cognome?: string; email?: string; telefono?: string; qualifica?: string }): Promise<{ data?: unknown; success?: boolean; error?: string }> => {
    const response = await fetchWithAuth(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseResponseBody<{ data?: unknown; success?: boolean; error?: string }>(response);
    if (!response.ok) {
      throw new Error(result?.error || 'Errore nell\'aggiornamento');
    }
    return result || {};
  },

  // Impostazioni organizzazione
  getSettings: async (): Promise<AziendaSettings> => {
    const response = await fetchWithAuth(`${API_BASE}/settings`);
    if (!response.ok) {
      throw new Error('Errore nel recupero delle impostazioni');
    }
    const data = await response.json();
    return data;
  },

  updateSettings: async (settings: Partial<AziendaSettings>): Promise<AziendaSettings> => {
    const response = await fetchWithAuth(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Errore nell\'aggiornamento delle impostazioni');
    }
    const data = await response.json();
    return data;
  },

  // GDPR - Esporta dati personali (diritto di accesso)
  exportMyData: async (): Promise<unknown> => {
    const response = await fetchWithAuth(`${API_BASE}/gdpr/export`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Errore nell\'esportazione');
    }
    return response.json();
  },

  // GDPR - Richiedi cancellazione account (diritto all'oblio)
  deleteMyAccount: async (password: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetchWithAuth(`${API_BASE}/gdpr/delete-account`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password, confirm: 'ELIMINA' }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Errore nella cancellazione');
    }
    return response.json();
  },

  // Moduli — Pianificazione interventi
  getPianificazione: async (dataInizio: string, dataFine: string): Promise<{
    eventi: EventoCalendario[];
    interventi: InterventoPianificato[];
  }> => {
    const params = new URLSearchParams({ dataInizio, dataFine });
    const response = await fetchWithAuth(`${API_BASE}/moduli/pianificazione?${params}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{ data?: { eventi: EventoCalendario[]; interventi: InterventoPianificato[] }; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero della pianificazione'));
    }
    return result?.data ?? { eventi: [], interventi: [] };
  },

  createInterventoPianificato: async (data: {
    titolo: string;
    descrizione?: string;
    dataPianificata: string;
    oraPianificata?: string;
    clienteId?: string;
    utenteId?: string;
  }): Promise<InterventoPianificato> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/pianificazione`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseResponseBody<{ data?: InterventoPianificato; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nella creazione'));
    }
    return result!.data!;
  },

  updateInterventoPianificato: async (
    id: string,
    data: Partial<{
      titolo: string;
      descrizione: string | null;
      dataPianificata: string;
      oraPianificata: string | null;
      clienteId: string | null;
      utenteId: string | null;
      stato: 'pianificato' | 'completato' | 'annullato';
    }>
  ): Promise<InterventoPianificato> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/pianificazione/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseResponseBody<{ data?: InterventoPianificato; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nell\'aggiornamento'));
    }
    return result!.data!;
  },

  deleteInterventoPianificato: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/pianificazione/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const result = await parseResponseBody<{ error?: string }>(response);
      throw new Error(getApiErrorMessage(result, 'Errore nell\'eliminazione'));
    }
  },

  getInterventoPianificatoPrefill: async (id: string): Promise<{
    interventoId: string;
    titolo: string;
    stato: string;
    prefill: Partial<RapportinoFormValues>;
  }> => {
    const response = await fetchWithAuth(`${API_BASE}/interventi-pianificati/${id}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{
      data?: {
        interventoId: string;
        titolo: string;
        stato: string;
        prefill: Partial<RapportinoFormValues>;
      };
      error?: string;
    }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero dell\'intervento'));
    }
    return result!.data!;
  },

  completaInterventoPianificato: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/interventi-pianificati/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stato: 'completato' }),
    });
    if (!response.ok) {
      const result = await parseResponseBody<{ error?: string }>(response);
      throw new Error(getApiErrorMessage(result, 'Errore nel completamento'));
    }
  },

  // Moduli — Assegnazione lavori
  getAssegnazioneLavori: async (dataInizio?: string, dataFine?: string): Promise<{
    tecnici: TecnicoCaricoLavoro[];
    nonAssegnati: InterventoPianificato[];
    totaleInterventi: number;
  }> => {
    const params = new URLSearchParams();
    if (dataInizio) params.set('dataInizio', dataInizio);
    if (dataFine) params.set('dataFine', dataFine);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchWithAuth(`${API_BASE}/moduli/assegnazione${qs}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{
      data?: { tecnici: TecnicoCaricoLavoro[]; nonAssegnati: InterventoPianificato[]; totaleInterventi: number };
      error?: string;
    }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero assegnazioni'));
    }
    return result?.data ?? { tecnici: [], nonAssegnati: [], totaleInterventi: 0 };
  },

  assegnaIntervento: async (interventoId: string, utenteId: string | null): Promise<InterventoPianificato> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/assegnazione`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ interventoId, utenteId }),
    });
    const result = await parseResponseBody<{ data?: InterventoPianificato; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nell\'assegnazione'));
    }
    return result!.data!;
  },

  // Moduli — Scadenze manutenzioni
  getScadenze: async (filtro?: string): Promise<{
    scadenze: ScadenzaManutenzione[];
    riepilogo: { totale: number; scaduti: number; urgenti: number; prossimi: number; nonNotificati: number };
  }> => {
    const params = filtro ? `?filtro=${filtro}` : '';
    const response = await fetchWithAuth(`${API_BASE}/moduli/scadenze${params}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{
      data?: {
        scadenze: ScadenzaManutenzione[];
        riepilogo: { totale: number; scaduti: number; urgenti: number; prossimi: number; nonNotificati: number };
      };
      error?: string;
    }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero scadenze'));
    }
    return result?.data ?? { scadenze: [], riepilogo: { totale: 0, scaduti: 0, urgenti: 0, prossimi: 0, nonNotificati: 0 } };
  },

  segnaScadenzaNotificata: async (
    rapportinoId: string,
    dataScadenza: string,
    inviaEmail = false
  ): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/scadenze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rapportinoId, dataScadenza, inviaEmail }),
    });
    if (!response.ok) {
      const result = await parseResponseBody<{ error?: string }>(response);
      throw new Error(getApiErrorMessage(result, 'Errore nella notifica'));
    }
  },

  getTecniciModulo: async (): Promise<Array<{ id: string; nome: string; cognome: string; qualifica?: string | null }>> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/tecnici`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{ data?: Array<{ id: string; nome: string; cognome: string; qualifica?: string | null }>; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero tecnici'));
    }
    return result?.data ?? [];
  },

  // Moduli — Planner (percorsi + CRM)
  getPlannerPercorso: async (data: string, utenteId?: string, geocodifica = false): Promise<PlannerPercorso> => {
    const params = new URLSearchParams({ data });
    if (utenteId) params.set('utenteId', utenteId);
    if (geocodifica) params.set('geocodifica', 'true');
    const response = await fetchWithAuth(`${API_BASE}/moduli/planner?${params}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{ data?: PlannerPercorso; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero del percorso'));
    }
    return result!.data!;
  },

  optimizePlannerPercorso: async (data: string, utenteId?: string): Promise<{
    percorso: PlannerPercorso['percorso'];
    mapsUrl: string;
    orariAggiornati: number;
  }> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/planner`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data, utenteId, geocodificaMancanti: true }),
    });
    const result = await parseResponseBody<{
      data?: { percorso: PlannerPercorso['percorso']; mapsUrl: string; orariAggiornati: number };
      error?: string;
    }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nell\'ottimizzazione del percorso'));
    }
    return result!.data!;
  },

  getPlannerClienti: async (q?: string): Promise<PlannerClienteListItem[]> => {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const response = await fetchWithAuth(`${API_BASE}/moduli/planner/clienti${params}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{ data?: PlannerClienteListItem[]; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero contatti'));
    }
    return result?.data ?? [];
  },

  getPlannerCliente: async (id: string): Promise<PlannerClienteDettaglio> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/planner/clienti/${id}`, {
      headers: getAuthHeaders(),
    });
    const result = await parseResponseBody<{ data?: PlannerClienteDettaglio; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nel recupero del cliente'));
    }
    return result!.data!;
  },

  updatePlannerCliente: async (
    id: string,
    data: Partial<{
      nome: string;
      cognome: string;
      telefono: string;
      email: string | null;
      indirizzo: string;
      citta: string;
      cap: string;
      provincia: string | null;
      note: string | null;
    }>
  ): Promise<{ id: string; nome: string; cognome: string; telefono: string; email?: string; indirizzo: string; citta: string }> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/planner/clienti/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseResponseBody<{
      data?: { id: string; nome: string; cognome: string; telefono: string; email?: string; indirizzo: string; citta: string };
      error?: string;
    }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nell\'aggiornamento del cliente'));
    }
    return result!.data!;
  },

  addPlannerClienteNota: async (clienteId: string, testo: string): Promise<ClienteNotaCrm> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/planner/clienti/${clienteId}/note`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ testo }),
    });
    const result = await parseResponseBody<{ data?: ClienteNotaCrm; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nella creazione della nota'));
    }
    return result!.data!;
  },

  addPlannerClienteContatto: async (
    clienteId: string,
    data: { nome: string; ruolo?: string; telefono?: string; email?: string; principale?: boolean }
  ): Promise<ClienteContattoCrm> => {
    const response = await fetchWithAuth(`${API_BASE}/moduli/planner/clienti/${clienteId}/contatti`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await parseResponseBody<{ data?: ClienteContattoCrm; error?: string }>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(result, 'Errore nella creazione del contatto'));
    }
    return result!.data!;
  },

  deletePlannerClienteContatto: async (clienteId: string, contattoId: string): Promise<void> => {
    const response = await fetchWithAuth(
      `${API_BASE}/moduli/planner/clienti/${clienteId}/contatti?contattoId=${encodeURIComponent(contattoId)}`,
      { method: 'DELETE', headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const result = await parseResponseBody<{ error?: string }>(response);
      throw new Error(getApiErrorMessage(result, 'Errore nell\'eliminazione del contatto'));
    }
  },

  // Ottieni documentazione API
  getApiDocs: async () => {
    const response = await fetch(`${API_BASE}/docs`);
    if (!response.ok) {
      throw new Error('Errore nel recupero della documentazione API');
    }
    return response.json();
  },
};

