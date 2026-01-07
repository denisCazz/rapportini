import { NextRequest } from 'next/server';

/**
 * Ottiene l'ID utente dalla richiesta
 * Cerca prima nell'header X-User-Id, poi nel body, poi nei query params
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  // Prova header
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  // Prova query param
  const queryUserId = request.nextUrl.searchParams.get('userId');
  if (queryUserId) return queryUserId;

  return null;
}

/**
 * Ottiene i dati utente completi dalla richiesta
 * Richiede che l'ID utente sia passato nella richiesta
 */
export async function getUserFromRequest(request: NextRequest): Promise<{ id: string; ruolo: string } | null> {
  const userId = getUserIdFromRequest(request);
  if (!userId) return null;

  // Qui potresti fare una query al DB per ottenere i dati completi
  // Per ora restituiamo solo l'ID e assumiamo che il ruolo sia passato
  const ruolo = request.headers.get('x-user-ruolo') || 'operatore';
  
  return { id: userId, ruolo };
}

