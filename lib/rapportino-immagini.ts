import { prisma } from '@/lib/db';
import { isOrgAdminRole } from '@/lib/roles';
import { BUCKET_ACTIVE } from '@/lib/media-config';
import { deleteFromAllBuckets } from '@/lib/media-storage';
import type { RapportinoImmagine } from '@/types';

export function mapDbRowToImmagine(row: {
  id: string;
  storage_key: string;
  bucket: string;
  mime_type: string;
  size_bytes: bigint | null;
  caption: string | null;
  archived_at: Date | null;
  created_at: Date | null;
}): RapportinoImmagine {
  return {
    id: row.id,
    storageKey: row.storage_key,
    bucket: row.bucket,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : undefined,
    caption: row.caption ?? undefined,
    archivedAt: row.archived_at?.toISOString(),
    createdAt: row.created_at?.toISOString() ?? new Date().toISOString(),
  };
}

export async function getImmaginiForRapportino(rapportinoId: string, orgId: string): Promise<RapportinoImmagine[]> {
  const rows = await prisma.rapportinoImmagini.findMany({
    where: { rapportino_id: rapportinoId, org_id: orgId },
    orderBy: { created_at: 'asc' },
  });
  return rows.map(mapDbRowToImmagine);
}

export async function assertRapportinoAccess(
  rapportinoId: string,
  orgId: string,
  userId: string,
  userRole: string
): Promise<{ id: string; utente_id: string } | null> {
  const rapportino = await prisma.rapportini.findFirst({
    where: { id: rapportinoId, org_id: orgId },
    select: { id: true, utente_id: true },
  });
  if (!rapportino) return null;
  if (!isOrgAdminRole(userRole) && rapportino.utente_id !== userId) return null;
  return rapportino;
}

export async function countActiveImages(rapportinoId: string, orgId: string): Promise<number> {
  return prisma.rapportinoImmagini.count({
    where: {
      rapportino_id: rapportinoId,
      org_id: orgId,
      bucket: BUCKET_ACTIVE,
      archived_at: null,
    },
  });
}

/** Elimina tutti i file storage associati a un rapportino (prima della DELETE DB). */
export async function deleteAllImmaginiStorage(rapportinoId: string, orgId: string): Promise<void> {
  const rows = await prisma.rapportinoImmagini.findMany({
    where: { rapportino_id: rapportinoId, org_id: orgId },
    select: { storage_key: true, bucket: true },
  });
  await Promise.all(
    rows.map((row) => deleteFromAllBuckets(row.storage_key))
  );
}
