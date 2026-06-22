/**
 * Backup database PostgreSQL + media su Cloudflare R2.
 *
 * Uso:
 *   npx tsx scripts/backup-cloudflare.ts
 *
 * Richiede variabili R2_* in .env (vedi .env.example).
 * Opzionale: BACKUP_DIR locale per dump temporaneo, STORAGE_BASE_PATH per media.
 */
import 'dotenv/config';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { getStorageBasePath } from '@/lib/media-config';
import {
  buildBackupObjectKey,
  createR2Client,
  getR2ConfigFromEnv,
  pruneOldR2Backups,
  uploadFileToR2,
} from '@/lib/cloudflare-r2';

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Variabile ${name} mancante`);
  }
  return value;
}

async function createDatabaseDump(outputPath: string): Promise<void> {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = requireEnv('POSTGRES_USER', 'bitora');
  const db = requireEnv('POSTGRES_DB', 'bitora');
  const password = requireEnv('POSTGRES_PASSWORD');

  execSync(
    `pg_dump -h "${host}" -p "${port}" -U "${user}" -d "${db}" -Fc -f "${outputPath}"`,
    {
      env: { ...process.env, PGPASSWORD: password },
      stdio: 'inherit',
    }
  );
}

async function createMediaArchive(outputPath: string, mediaBasePath: string): Promise<boolean> {
  try {
    await fs.access(mediaBasePath);
  } catch {
    console.warn(`Media path assente, skip archivio: ${mediaBasePath}`);
    return false;
  }

  const entries = await fs.readdir(mediaBasePath);
  if (entries.length === 0) {
    console.warn('Nessun file media da archiviare');
    return false;
  }

  // tar.gz via tar command (disponibile su Linux/macOS; in Docker usare immagine con tar)
  execSync(`tar -czf "${outputPath}" -C "${mediaBasePath}" .`, { stdio: 'inherit' });
  return true;
}

async function main(): Promise<void> {
  const config = getR2ConfigFromEnv();
  if (!config) {
    console.error(
      'Configurazione R2 incompleta. Imposta R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.'
    );
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bitora-backup-'));
  const existingDump = process.env.BACKUP_FILE;
  const dbDumpPath = existingDump && (await fs.stat(existingDump).then(() => true).catch(() => false))
    ? existingDump
    : path.join(workDir, `bitora_${stamp}.dump`);
  const mediaArchivePath = path.join(workDir, `media_${stamp}.tar.gz`);
  const ownsDbDump = dbDumpPath.startsWith(workDir);

  console.log(`Backup Cloudflare R2 — ${stamp}`);
  console.log(`Bucket: ${config.bucketName} / prefix: ${config.prefix}`);

  try {
    if (ownsDbDump) {
      console.log('1/3 Dump database PostgreSQL...');
      await createDatabaseDump(dbDumpPath);
    } else {
      console.log(`1/3 Uso dump esistente: ${dbDumpPath}`);
    }

    console.log('2/3 Archivio media...');
    const mediaBasePath = getStorageBasePath();
    const hasMedia = await createMediaArchive(mediaArchivePath, mediaBasePath);

    const client = createR2Client(config);

    console.log('3/3 Upload su R2...');
    const dbKey = buildBackupObjectKey(config, stamp, path.basename(dbDumpPath));
    await uploadFileToR2(client, config, dbDumpPath, dbKey, 'application/octet-stream');
    console.log(`  ✓ DB → s3://${config.bucketName}/${dbKey}`);

    if (hasMedia) {
      const mediaKey = buildBackupObjectKey(config, stamp, path.basename(mediaArchivePath));
      await uploadFileToR2(client, config, mediaArchivePath, mediaKey, 'application/gzip');
      console.log(`  ✓ Media → s3://${config.bucketName}/${mediaKey}`);
    }

    const retentionDays = parseInt(process.env.R2_BACKUP_RETENTION_DAYS || '30', 10);
    const deleted = await pruneOldR2Backups(client, config, retentionDays);
    if (deleted > 0) {
      console.log(`Retention: eliminati ${deleted} oggetti più vecchi di ${retentionDays} giorni`);
    }

    console.log('Backup completato.');
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('Backup R2 fallito:', error);
  process.exit(1);
});
