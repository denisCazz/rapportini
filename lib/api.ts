import { Rapportino, AziendaSettings } from '@/types';
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
  search?: string;
  page?: number;
  limit?: number;
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

  // Ottieni statistiche admin
  getStatistics: async () => {
    const headers = getAuthHeaders();
    const response = await fetchWithAuth(`${API_BASE}/admin/statistics`, {
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nel recupero delle statistiche');
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

  // Ottieni documentazione API
  getApiDocs: async () => {
    const response = await fetch(`${API_BASE}/docs`);
    if (!response.ok) {
      throw new Error('Errore nel recupero della documentazione API');
    }
    return response.json();
  },
};

