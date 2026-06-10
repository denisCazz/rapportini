import { prisma } from '@/lib/db';
import { isCatOrgId } from '@/lib/cat-org';

export const CAT_STATO = {
  IN_ATTESA: 'in_attesa',
  ATTIVO: 'attivo',
  SOSPESO: 'sospeso',
} as const;

export type CatStato = (typeof CAT_STATO)[keyof typeof CAT_STATO];

export const CAT_STATO_LABELS: Record<CatStato, string> = {
  in_attesa: 'In attesa di approvazione',
  attivo: 'Attivo',
  sospeso: 'Sospeso',
};

export function catStatoBlocksAccess(stato: string | null | undefined): boolean {
  return stato === CAT_STATO.IN_ATTESA || stato === CAT_STATO.SOSPESO;
}

export function catStatoErrorMessage(stato: string | null | undefined): string {
  if (stato === CAT_STATO.IN_ATTESA) {
    return 'Il CAT è in attesa di approvazione da parte dell\'amministratore piattaforma.';
  }
  if (stato === CAT_STATO.SOSPESO) {
    return 'Il CAT è stato sospeso. Contatta il supporto per riattivarlo.';
  }
  return 'Il CAT non è attivo.';
}

export async function getCatOrgStato(orgId: string): Promise<string | null> {
  if (!isCatOrgId(orgId)) return null;

  const org = await prisma.organizzazioni.findUnique({
    where: { org_id: orgId },
    select: { stato: true, tipo: true },
  });

  if (!org || org.tipo !== 'cat') return null;
  return org.stato;
}

export async function assertCatOrgAllowsAccess(
  orgId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stato = await getCatOrgStato(orgId);
  if (!stato) return { ok: true };

  if (stato === CAT_STATO.ATTIVO) return { ok: true };
  return { ok: false, error: catStatoErrorMessage(stato) };
}
