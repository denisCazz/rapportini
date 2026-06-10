import { prisma } from '@/lib/db';
import { ModuleCode } from '@/lib/modules';

export async function getActiveModuleCodesForUser(
  userId: string,
  orgId: string
): Promise<ModuleCode[]> {
  const rows = await prisma.utenteModuli.findMany({
    where: {
      utente_id: userId,
      org_id: orgId,
      attivo: true,
    },
    include: {
      moduli: { select: { code: true } },
    },
  });

  return rows.map((row) => row.moduli.code as ModuleCode);
}

export async function isModuleActiveForUser(
  userId: string,
  orgId: string,
  moduleCode: ModuleCode
): Promise<boolean> {
  const row = await prisma.utenteModuli.findFirst({
    where: {
      utente_id: userId,
      org_id: orgId,
      attivo: true,
      moduli: { code: moduleCode },
    },
    select: { id: true },
  });

  return Boolean(row);
}

export async function setModuleActiveForUser(
  userId: string,
  orgId: string,
  moduleCode: ModuleCode,
  attivo: boolean
): Promise<void> {
  const modulo = await prisma.moduli.findUnique({
    where: { code: moduleCode },
    select: { id: true },
  });

  if (!modulo) {
    throw new Error('Modulo non trovato');
  }

  const utente = await prisma.utenti.findFirst({
    where: { id: userId, org_id: orgId },
    select: { id: true },
  });

  if (!utente) {
    throw new Error('Utente non trovato');
  }

  await prisma.utenteModuli.upsert({
    where: {
      utente_id_modulo_id: {
        utente_id: userId,
        modulo_id: modulo.id,
      },
    },
    create: {
      utente_id: userId,
      modulo_id: modulo.id,
      org_id: orgId,
      attivo,
    },
    update: {
      attivo,
      updated_at: new Date(),
    },
  });
}
