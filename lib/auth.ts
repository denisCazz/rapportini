import { canManageModulesAdmin } from '@/lib/module-admin';
import { isCatAdmin, isOrgAdminRole, isPlatformAdmin, UserRole } from '@/lib/roles';

const STORAGE_KEY_AUTH = 'auth_token';
const STORAGE_KEY_USER = 'user_data';
const STORAGE_KEY_ACCESS_TOKEN = 'access_token';
const STORAGE_KEY_REFRESH_TOKEN = 'refresh_token';

export interface User {
  id: string;
  username: string;
  org_id?: string;
  ruolo: UserRole;
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  qualifica?: string;
  firma?: string;
  /** True finché non si cambia password (seed / policy) */
  must_change_password?: boolean;
}

// Helper per refresh automatico del token
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const auth = {
  // Login tramite API
  login: async (
    username: string,
    password: string,
    options?: {
      orgId?: string;
      partitaIva?: string;
      ragioneSociale?: string;
    }
  ): Promise<{ success: boolean; user?: User; error?: string; retryAfter?: number }> => {
    try {
      const effectiveOrgId = (options?.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '').trim();
      const partitaIva = (options?.partitaIva || '').trim();
      const ragioneSociale = (options?.ragioneSociale || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (effectiveOrgId) {
        headers['X-Org-Id'] = effectiveOrgId;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        credentials: 'include', // Importante per i cookie
        body: JSON.stringify({
          username,
          password,
          org_id: effectiveOrgId || undefined,
          partita_iva: partitaIva || undefined,
          ragione_sociale: ragioneSociale || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || 'Errore durante il login',
          retryAfter: data.retryAfter,
        };
      }

      if (data.success && data.user) {
        if (typeof window !== 'undefined') {
          const userPayload: User = {
            ...data.user,
            must_change_password: Boolean(data.user.must_change_password),
          };
          localStorage.setItem(STORAGE_KEY_AUTH, 'authenticated');
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userPayload));
          // Salva anche i token per retrocompatibilità
          if (data.accessToken) {
            localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, data.accessToken);
          }
          if (data.refreshToken) {
            localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, data.refreshToken);
          }
        }
        return {
          success: true,
          user: {
            ...data.user,
            must_change_password: Boolean(data.user.must_change_password),
          } as User,
        };
      }

      return { success: false, error: 'Errore durante il login' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Errore di connessione' };
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
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
    if (!userData) return null;
    const parsed = JSON.parse(userData) as User & { idsocieta?: string };
    if (!parsed.org_id && parsed.idsocieta) {
      parsed.org_id = parsed.idsocieta;
      delete (parsed as User & { idsocieta?: string }).idsocieta;
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(parsed));
    }
    return parsed;
  },

  // Aggiorna dati utente in localStorage
  updateUser: (user: User): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  },

  // Verifica se l'utente è admin
  isAdmin: (): boolean => {
    const user = auth.getUser();
    return isOrgAdminRole(user?.ruolo);
  },

  isPlatformAdmin: (): boolean => {
    const user = auth.getUser();
    return isPlatformAdmin(user?.ruolo);
  },

  isCatAdmin: (): boolean => {
    const user = auth.getUser();
    return isCatAdmin(user?.ruolo);
  },

  // Verifica se l'utente è operatore
  isOperatore: (): boolean => {
    const user = auth.getUser();
    return user?.ruolo === 'operatore';
  },

  /** Gestione manuale moduli admin (solo super-admin). */
  canManageModulesAdmin: (): boolean => {
    const user = auth.getUser();
    if (!user || !isPlatformAdmin(user.ruolo)) return false;
    return canManageModulesAdmin(user.email);
  },

  // Refresh token
  refreshTokens,

  // Ottieni access token
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
  },
};

// Dati operatore predefiniti (solo per test/demo - non usare in produzione)
export const DEFAULT_OPERATORE = {
  nome: '',
  cognome: '',
  telefono: '',
  email: '',
  qualifica: '',
};
