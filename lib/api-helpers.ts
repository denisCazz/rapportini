import { auth } from './auth';

/**
 * Parsa il body della risposta come JSON in modo sicuro
 */
export async function parseResponseBody<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error('Risposta API non JSON:', response.status, text.slice(0, 120));
    return null;
  }
}

/**
 * Estrae il messaggio di errore da una risposta API
 */
export function getApiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const maybeError = (data as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) {
      return maybeError;
    }
  }
  return fallback;
}

/**
 * Ottiene gli header di autenticazione per le richieste API
 */
export function getAuthHeaders(options?: { skipContentType?: boolean }): Record<string, string> {
  const user = auth.getUser();
  const headers: Record<string, string> = {};
  if (!options?.skipContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (user) {
    headers['X-User-Id'] = user.id;
    headers['X-User-Ruolo'] = user.ruolo;
    if (user.org_id) {
      headers['X-Org-Id'] = user.org_id;
    }
  }

  const accessToken = auth.getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * Fetch con autenticazione, retry su 401 e refresh token
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const baseHeaders = getAuthHeaders();
  const mergedHeaders: Record<string, string> = {
    ...baseHeaders,
    ...(init.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)
      ? (init.headers as Record<string, string>)
      : {}),
  };

  const baseInit: RequestInit = {
    ...init,
    headers: mergedHeaders,
    credentials: 'include',
  };

  let response = await fetch(input, baseInit);

  if (response.status === 401) {
    const refreshed = await auth.refreshTokens();
    if (refreshed) {
      const retryHeaders = { ...mergedHeaders, ...getAuthHeaders() };
      response = await fetch(input, {
        ...baseInit,
        headers: retryHeaders,
      });
    }
  }

  return response;
}
