import { Rapportino } from '@/types';
import { auth } from './auth';

const API_BASE = '/api';

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
    if (!response.ok) {
      throw new Error('Errore nel recupero dei rapportini');
    }
    const result = await response.json();
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
    if (!response.ok) {
      throw new Error('Errore nel recupero dei rapportini');
    }
    return response.json();
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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nella creazione del rapportino');
    }
    return response.json();
  },

  // Ottieni un singolo rapportino per ID
  getRapportino: async (id: string): Promise<Rapportino> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/rapportini/${id}`, {
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nel recupero del rapportino');
    }
    return response.json();
  },

  // Elimina un rapportino
  deleteRapportino: async (id: string): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/rapportini/${id}`, {
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
    const response = await fetch(`${API_BASE}/admin/statistics`, {
      headers,
      credentials: 'include',
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
    const response = await fetch(`${API_BASE}/email/send`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ rapportino, aziendaNome }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Errore nell\'invio dell\'email');
    }
    return result;
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

