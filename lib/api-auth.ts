import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

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
  return (request.headers.get('x-org-id')
    || request.headers.get('x-user-idsocieta')
    || request.headers.get('x-tenant-id')
    || fallback).trim();
}

/**
 * Risolve org_id per endpoint auth pre-login (senza contesto JWT affidabile)
 * Priorità: header -> env -> primo org_id esistente in utenti
 */
export async function resolveAuthOrgId(request: NextRequest): Promise<string | null> {
  const headerOrgId = getOrgIdFromRequest(request, '');
  if (headerOrgId) {
    return headerOrgId;
  }

  const envOrgId = (process.env.DEFAULT_ORG_ID || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '').trim();
  if (envOrgId) {
    return envOrgId;
  }

  try {
    const row = await prisma.utenti.findFirst({
      orderBy: { created_at: 'asc' },
      select: { org_id: true },
    });
    return row?.org_id?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Ottiene i dati utente completi dalla richiesta.
 * L'org_id canonico proviene dal database (non dagli header JWT).
 */
export async function getUserFromRequest(request: NextRequest): Promise<{ id: string; ruolo: string; org_id: string } | null> {
  const { resolveAuthenticatedTenant } = await import('@/lib/tenant-context');
  const user = await resolveAuthenticatedTenant(request);
  if (!user) return null;
  return { id: user.id, ruolo: user.ruolo, org_id: user.org_id };
}

