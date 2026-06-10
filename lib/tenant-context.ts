import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';

export interface AuthenticatedTenant {
  id: string;
  org_id: string;
  ruolo: string;
  username: string;
}

export type TenantAuthResult =
  | { ok: true; user: AuthenticatedTenant }
  | { ok: false; response: NextResponse };

/**
 * Risolve il contesto tenant dall'utente autenticato.
 * L'org_id canonico proviene sempre dal database, non dagli header JWT.
 */
export async function resolveAuthenticatedTenant(
  request: NextRequest
): Promise<AuthenticatedTenant | null> {
  const userId = getUserIdFromRequest(request);
  if (!userId) return null;

  const utente = await prisma.utenti.findUnique({
    where: { id: userId },
    select: {
      id: true,
      org_id: true,
      ruolo: true,
      username: true,
      attivo: true,
    },
  });

  if (!utente || utente.attivo === false) return null;

  const headerOrgId = getOrgIdFromRequest(request, '');
  if (headerOrgId && headerOrgId !== utente.org_id) {
    console.warn(
      `[tenant] org_id header (${headerOrgId}) diverso da DB (${utente.org_id}) per utente ${userId}`
    );
  }

  return {
    id: utente.id,
    org_id: utente.org_id,
    ruolo: utente.ruolo,
    username: utente.username,
  };
}

export async function requireAuthenticatedTenant(
  request: NextRequest
): Promise<TenantAuthResult> {
  const user = await resolveAuthenticatedTenant(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function assertClienteInOrg(
  clienteId: string,
  orgId: string
): Promise<boolean> {
  const cliente = await prisma.clienti.findFirst({
    where: { id: clienteId, org_id: orgId },
    select: { id: true },
  });
  return Boolean(cliente);
}

export async function assertUtenteInOrg(
  utenteId: string,
  orgId: string,
  ruolo?: 'operatore' | 'admin'
): Promise<boolean> {
  const utente = await prisma.utenti.findFirst({
    where: {
      id: utenteId,
      org_id: orgId,
      attivo: true,
      ...(ruolo ? { ruolo } : {}),
    },
    select: { id: true },
  });
  return Boolean(utente);
}

export async function assertRapportinoInOrg(
  rapportinoId: string,
  orgId: string
): Promise<boolean> {
  const rapportino = await prisma.rapportini.findFirst({
    where: { id: rapportinoId, org_id: orgId },
    select: { id: true },
  });
  return Boolean(rapportino);
}

export async function assertInterventoInOrg(
  interventoId: string,
  orgId: string
): Promise<boolean> {
  const intervento = await prisma.interventiPianificati.findFirst({
    where: { id: interventoId, org_id: orgId },
    select: { id: true },
  });
  return Boolean(intervento);
}
