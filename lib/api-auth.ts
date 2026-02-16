import { NextRequest } from 'next/server';

const DEFAULT_TENANT_ID = 'default';

/**
 * Ottiene l'ID utente dalla richiesta
 * Cerca prima nell'header X-User-Id, poi nel body, poi nei query params
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  // Prova header
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  return null;
}

/**
 * Ottiene l'ID organizzazione (org_id) dal contesto autenticato
 * Preferisce x-org-id, con fallback legacy transitorio.
 */
export function getOrgIdFromRequest(request: NextRequest, fallback = DEFAULT_TENANT_ID): string {
  return request.headers.get('x-org-id')
    || request.headers.get('x-user-idsocieta')
    || request.headers.get('x-tenant-id')
    || fallback;
}

/**
 * Ottiene i dati utente completi dalla richiesta
 * Richiede che l'ID utente sia passato nella richiesta
 */
export async function getUserFromRequest(request: NextRequest): Promise<{ id: string; ruolo: string; org_id: string } | null> {
  const userId = getUserIdFromRequest(request);
  if (!userId) return null;

  // Qui potresti fare una query al DB per ottenere i dati completi
  // Per ora restituiamo solo l'ID e assumiamo che il ruolo sia passato
  const ruolo = request.headers.get('x-user-ruolo') || 'operatore';
  const org_id = getOrgIdFromRequest(request);
  
  return { id: userId, ruolo, org_id };
}

