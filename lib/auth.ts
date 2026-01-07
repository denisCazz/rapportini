const STORAGE_KEY_AUTH = 'auth_token';
const STORAGE_KEY_USER = 'user_data';

export interface User {
  id: string;
  username: string;
  ruolo: 'admin' | 'operatore';
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  qualifica?: string;
}

export const auth = {
  // Login tramite API
  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Errore durante il login' };
      }

      if (data.success && data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_AUTH, 'authenticated');
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        }
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Errore durante il login' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Errore di connessione' };
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    }
  },

  // Verifica se l'utente è autenticato
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'authenticated';
  },

  // Ottieni dati utente
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(STORAGE_KEY_USER);
    return userData ? JSON.parse(userData) : null;
  },

  // Verifica se l'utente è admin
  isAdmin: (): boolean => {
    const user = auth.getUser();
    return user?.ruolo === 'admin';
  },

  // Verifica se l'utente è operatore
  isOperatore: (): boolean => {
    const user = auth.getUser();
    return user?.ruolo === 'operatore';
  },
};

// Dati operatore predefiniti
export const DEFAULT_OPERATORE = {
  nome: 'Gianfranco',
  cognome: 'Tropini',
  telefono: '+39 333 1234567',
  email: 'gianfranco.tropini@bitora.it',
  qualifica: 'Tecnico specializzato',
};
