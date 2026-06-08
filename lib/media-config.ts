/** Bucket attivo (file recenti, serviti all'UI) */
export const BUCKET_ACTIVE = 'rapportini-active';

/** Bucket archivio (file oltre N mesi) */
export const BUCKET_ARCHIVE = 'rapportini-archive';

/** Mesi prima di spostare in archivio (default 24) */
export function getRetentionMonths(): number {
  const raw = process.env.RAPPORTINI_MEDIA_RETENTION_MONTHS;
  const n = raw ? parseInt(raw, 10) : 24;
  return Number.isFinite(n) && n > 0 ? n : 24;
}

export const MAX_IMAGES_PER_RAPPORTINO = 5;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB input
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export function getStorageBasePath(): string {
  return process.env.STORAGE_BASE_PATH || './data/media';
}
