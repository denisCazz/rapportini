import { Rapportino } from '@/types';
import { auth } from './auth';

const API_BASE = '/api';

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

export const api = {
  // Ottieni tutti i rapportini (filtrati per utente se operatore)
  getRapportini: async (): Promise<Rapportino[]> => {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE}/rapportini`, {
      headers,
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
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore nel recupero delle statistiche');
    }
    return response.json();
  },
};

