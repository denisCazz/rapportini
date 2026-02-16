import { Rapportino } from '@/types';
import { auth } from './auth';

const API_BASE = '/api';

type ParsedResponse<T = any> = {
  data: T | null;
  text: string;
};

async function parseResponseBody<T = any>(response: Response): Promise<ParsedResponse<T>> {
  const text = await response.text();

  if (!text) {
    return { data: null, text: '' };
  }

  try {
    return { data: JSON.parse(text) as T, text };
  } catch {
    return { data: null, text };
  }
}

function buildNonJsonErrorMessage(response: Response, fallback: string): string {
  if (response.status === 401) {
    return 'Sessione scaduta o non valida. Effettua nuovamente il login.';
  }
  return `${fallback} (risposta non JSON, status ${response.status})`;
}

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

// Helper per ottenere headers con autenticazione
function getAuthHeaders(): HeadersInit {
  const user = auth.getUser();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (user) {
    headers['X-User-Id'] = user.id;
    headers['X-User-Ruolo'] = user.ruolo;
    if (user.org_id) {
      headers['X-Org-Id'] = user.org_id;
    }
  }
  
  return headers;
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
    const response = await fetch(`${API_BASE}/rapportini${queryString}`, {
      headers,
      credentials: 'include',
    });
    const { data: result } = await parseResponseBody(response);
    if (!response.ok) {
      throw new Error((result as any)?.error || 'Errore nel recupero dei rapportini');
    }
    if (!result) {
      throw new Error(buildNonJsonErrorMessage(response, 'Errore nel recupero dei rapportini'));
    }
    // Supporta sia la vecchia risposta (array) che la nuova (paginata)
    return Array.isArray(result) ? result : result.data;
  },

  // Ottieni rapportini con paginazione
  getRapportiniPaginated: async (filters?: RapportiniFilters): Promise<PaginatedResponse<Rapportino>> => {
    const headers = getAuthHeaders();
    const queryString = filters ? buildQueryString(filters) : '';
    const response = await fetch(`${API_BASE}/rapportini${queryString}`, {
      headers,
      credentials: 'include',
    });
    const { data } = await parseResponseBody<PaginatedResponse<Rapportino>>(response);
    if (!response.ok) {
      throw new Error((data as any)?.error || 'Errore nel recupero dei rapportini');
    }
    if (!data) {
      throw new Error(buildNonJsonErrorMessage(response, 'Errore nel recupero dei rapportini'));
    }
    return data;
  },

  // Crea un nuovo rapportino
  createRapportino: async (rapportino: Rapportino): Promise<{ id: string; success: boolean }> => {
    const user = auth.getUser();
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    const response = await fetch(`${API_BASE}/rapportini`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rapportino,
        userId: user.id,
      }),
    });
    const { data } = await parseResponseBody<{ id: string; success: boolean; error?: string }>(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Errore nella creazione del rapportino');
    }
    if (!data) {
      throw new Error(buildNonJsonErrorMessage(response, 'Errore nella creazione del rapportino'));
    }
    return data;
  },

  // Ottieni un singolo rapportino per ID
  getRapportino: async (id: string): Promise<Rapportino> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/rapportini/${id}`, {
      headers,
    });
    const { data } = await parseResponseBody<Rapportino & { error?: string }>(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Errore nel recupero del rapportino');
    }
    if (!data) {
      throw new Error(buildNonJsonErrorMessage(response, 'Errore nel recupero del rapportino'));
    }
    return data;
  },

  // Elimina un rapportino
  deleteRapportino: async (id: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/rapportini/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    const { data } = await parseResponseBody<{ error?: string }>(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Errore nell\'eliminazione del rapportino');
    }
  },

  // Ottieni statistiche admin
  getStatistics: async () => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/admin/statistics`, {
      headers,
      credentials: 'include',
    });
    const { data } = await parseResponseBody<{ error?: string }>(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Errore nel recupero delle statistiche');
    }
    if (!data) {
      throw new Error(buildNonJsonErrorMessage(response, 'Errore nel recupero delle statistiche'));
    }
    return data;
  },

  // Invia email di conferma intervento
  sendInterventoEmail: async (rapportino: Rapportino, aziendaNome?: string): Promise<{ success: boolean; message: string }> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/email/send`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ rapportino, aziendaNome }),
    });
    const { data: result } = await parseResponseBody<{ success: boolean; message: string; error?: string }>(response);
    if (!response.ok) {
      throw new Error(result?.error || 'Errore nell\'invio dell\'email');
    }
    if (!result) {
      throw new Error(buildNonJsonErrorMessage(response, 'Errore nell\'invio dell\'email'));
    }
    return result;
  },

  // Ottieni documentazione API
  getApiDocs: async () => {
    const response = await fetch(`${API_BASE}/docs`);
    const { data } = await parseResponseBody(response);
    if (!response.ok) {
      throw new Error('Errore nel recupero della documentazione API');
    }
    if (!data) {
      throw new Error(buildNonJsonErrorMessage(response, 'Errore nel recupero della documentazione API'));
    }
    return data;
  },
};

