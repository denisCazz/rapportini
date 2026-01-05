const STORAGE_KEY_AUTH = 'auth_token';
const STORAGE_KEY_USER = 'user_data';

// Credenziali fittizie per il login
export const FAKE_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

export interface User {
  username: string;
  nome: string;
  cognome: string;
}

export const auth = {
  // Login fittizio
  login: (username: string, password: string): boolean => {
    if (
      username === FAKE_CREDENTIALS.username &&
      password === FAKE_CREDENTIALS.password
    ) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_AUTH, 'authenticated');
        localStorage.setItem(
          STORAGE_KEY_USER,
          JSON.stringify({
            username,
            nome: 'Gianfranco',
            cognome: 'Tropini',
          })
        );
      }
      return true;
    }
    return false;
  },

  // Logout
  logout: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_USER);
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
};

// Dati operatore predefiniti
export const DEFAULT_OPERATORE = {
  nome: 'Gianfranco',
  cognome: 'Tropini',
  telefono: '+39 333 1234567',
  email: 'gianfranco.tropini@bitora.it',
  qualifica: 'Tecnico specializzato',
};
