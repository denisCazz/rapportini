import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { isCatOrgId } from '@/lib/cat-org';
import { isCatAdmin, isPlatformAdmin } from '@/lib/roles';

/** Org visibili nella lista utenti per l'admin piattaforma (default + tutti i CAT). */
export async function getPlatformAdminVisibleOrgIds(requesterOrgId: string): Promise<string[]> {
  const catOrgs = await prisma.organizzazioni.findMany({
    where: { tipo: 'cat' },
    select: { org_id: true },
  });
  const orgIds = new Set([requesterOrgId, ...catOrgs.map((org) => org.org_id)]);
  return [...orgIds];
}

/** L'admin può accedere a un utente in questa organizzazione? */
export function canAdminAccessUserOrg(
  userRole: string | null | undefined,
  requesterOrgId: string,
  targetOrgId: string
): boolean {
  if (isCatAdmin(userRole)) {
    return requesterOrgId === targetOrgId;
  }
  if (isPlatformAdmin(userRole)) {
    return requesterOrgId === targetOrgId || isCatOrgId(targetOrgId);
  }
  return false;
}

export async function findUserAccessibleToAdmin<S extends Prisma.UtentiSelect>(
  userId: string,
  userRole: string | null | undefined,
  requesterOrgId: string,
  select: S
): Promise<(Prisma.UtentiGetPayload<{ select: S }> & { org_id: string }) | null> {
  const user = await prisma.utenti.findFirst({
    where: { id: userId },
    select: { ...select, org_id: true } as Prisma.UtentiSelect,
  });

  if (!user) {
    return null;
  }

  const { org_id: targetOrgId } = user as { org_id: string };
  if (!canAdminAccessUserOrg(userRole, requesterOrgId, targetOrgId)) {
    return null;
  }

  return user as Prisma.UtentiGetPayload<{ select: S }> & { org_id: string };
}

export async function getCatOrgLabels(orgIds: string[]): Promise<Map<string, string>> {
  const catOrgIds = orgIds.filter(isCatOrgId);
  if (catOrgIds.length === 0) return new Map();

  const orgs = await prisma.organizzazioni.findMany({
    where: { org_id: { in: catOrgIds }, tipo: 'cat' },
    select: { org_id: true, nome_azienda: true, partita_iva: true },
  });

  return new Map(
    orgs.map((org) => [
      org.org_id,
      org.nome_azienda?.trim() || org.partita_iva || org.org_id,
    ])
  );
}
