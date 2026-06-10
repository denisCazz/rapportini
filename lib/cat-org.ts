import { prisma } from '@/lib/db';
import { assertCatOrgAllowsAccess } from '@/lib/cat-status';

export const CAT_ORG_PREFIX = 'cat-';

export function normalizePartitaIva(partitaIva: string): string {
  return partitaIva.replace(/\D/g, '');
}

export function isValidPartitaIva(partitaIva: string): boolean {
  const digits = normalizePartitaIva(partitaIva);
  return digits.length === 11;
}

export function buildCatOrgId(partitaIva: string): string {
  return `${CAT_ORG_PREFIX}${normalizePartitaIva(partitaIva)}`;
}

export async function findCatOrgByPartitaIva(partitaIva: string) {
  const normalized = normalizePartitaIva(partitaIva);
  if (!normalized) return null;

  return prisma.organizzazioni.findFirst({
    where: {
      tipo: 'cat',
      partita_iva: normalized,
    },
    select: {
      org_id: true,
      nome_azienda: true,
      partita_iva: true,
      tipo: true,
      stato: true,
      invite_token: true,
    },
  });
}

export async function resolveCatOrgId(params: {
  partita_iva: string;
  ragione_sociale?: string;
}): Promise<{ orgId: string } | { error: string }> {
  const org = await findCatOrgByPartitaIva(params.partita_iva);
  if (!org) {
    return { error: 'CAT non trovato. Verifica la Partita IVA.' };
  }

  if (params.ragione_sociale?.trim()) {
    const expected = org.nome_azienda?.trim().toLowerCase() ?? '';
    const provided = params.ragione_sociale.trim().toLowerCase();
    if (expected && expected !== provided) {
      return { error: 'Ragione sociale non corrispondente al CAT indicato.' };
    }
  }

  const access = await assertCatOrgAllowsAccess(org.org_id);
  if (!access.ok) {
    return { error: access.error };
  }

  return { orgId: org.org_id };
}

export async function findCatOrgByInviteToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;

  return prisma.organizzazioni.findFirst({
    where: {
      tipo: 'cat',
      invite_token: trimmed,
    },
    select: {
      org_id: true,
      nome_azienda: true,
      partita_iva: true,
      stato: true,
    },
  });
}

export function buildOperatorInviteUrl(inviteToken: string, baseUrl?: string): string {
  const origin =
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'http://localhost:3000';
  return `${origin.replace(/\/$/, '')}/register?invite=${encodeURIComponent(inviteToken)}`;
}

export function isCatOrgId(orgId: string): boolean {
  return orgId.startsWith(CAT_ORG_PREFIX);
}
