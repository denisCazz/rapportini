/**
 * Sposta le immagini dei rapportini dal bucket attivo a quello archivio
 * dopo N mesi (RAPPORTINI_MEDIA_RETENTION_MONTHS, default 24).
 *
 * Uso: npx tsx scripts/archive-rapportini-immagini.ts
 * Cron consigliato: 0 4 * * * (dopo il backup DB alle 03:00)
 */
import 'dotenv/config';
import { prisma } from '../lib/db';
import {
  BUCKET_ACTIVE,
  BUCKET_ARCHIVE,
  getRetentionMonths,
} from '../lib/media-config';
import {
  buildArchiveStorageKey,
  moveToArchive,
} from '../lib/media-storage';

async function main() {
  const months = getRetentionMonths();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  console.log(`Archiviazione immagini rapportini più vecchie di ${months} mesi (prima del ${cutoff.toISOString()})`);

  const candidates = await prisma.rapportinoImmagini.findMany({
    where: {
      bucket: BUCKET_ACTIVE,
      archived_at: null,
      created_at: { lt: cutoff },
    },
    orderBy: { created_at: 'asc' },
    take: 500,
  });

  if (!candidates.length) {
    console.log('Nessuna immagine da archiviare.');
    return;
  }

  let archived = 0;
  let errors = 0;

  for (const img of candidates) {
    try {
      const year = img.created_at?.getFullYear() ?? new Date().getFullYear();
      const parts = img.storage_key.split('/');
      const fileName = parts[parts.length - 1];
      const fileId = fileName.replace(/\.[^.]+$/, '');
      const ext = fileName.includes('.') ? fileName.split('.').pop()! : 'jpg';

      const archiveKey = buildArchiveStorageKey(img.org_id, year, img.rapportino_id, fileId, ext);

      await moveToArchive(img.storage_key, archiveKey);
      await prisma.rapportinoImmagini.update({
        where: { id: img.id },
        data: {
          bucket: BUCKET_ARCHIVE,
          storage_key: archiveKey,
          archived_at: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          org_id: img.org_id,
          action: 'media_archived',
          resource: `rapportino_immagini:${img.id}`,
          details: { rapportino_id: img.rapportino_id, archive_key: archiveKey },
        },
      });

      archived++;
    } catch (err) {
      errors++;
      console.error(`Errore archiviazione ${img.id}:`, err);
    }
  }

  console.log(`Completato: ${archived} archiviate, ${errors} errori.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
