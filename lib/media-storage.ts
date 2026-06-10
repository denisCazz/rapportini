import { promises as fs } from 'fs';
import path from 'path';
import {
  BUCKET_ACTIVE,
  BUCKET_ARCHIVE,
  getStorageBasePath,
} from '@/lib/media-config';

function bucketPath(bucket: string, storageKey: string): string {
  return path.join(getStorageBasePath(), bucket, storageKey);
}

export function buildActiveStorageKey(orgId: string, rapportinoId: string, fileId: string, ext: string): string {
  return `${orgId}/${rapportinoId}/${fileId}.${ext}`;
}

export function buildArchiveStorageKey(
  orgId: string,
  year: number,
  rapportinoId: string,
  fileId: string,
  ext: string
): string {
  return `${orgId}/${year}/${rapportinoId}/${fileId}.${ext}`;
}

export async function ensureBucketDir(bucket: string, storageKey: string): Promise<string> {
  const fullPath = bucketPath(bucket, storageKey);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

export async function writeToBucket(bucket: string, storageKey: string, data: Buffer): Promise<void> {
  const fullPath = await ensureBucketDir(bucket, storageKey);
  await fs.writeFile(fullPath, data);
}

export async function readFromBucket(bucket: string, storageKey: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(bucketPath(bucket, storageKey));
  } catch {
    return null;
  }
}

export async function deleteFromBucket(bucket: string, storageKey: string): Promise<void> {
  try {
    await fs.unlink(bucketPath(bucket, storageKey));
  } catch {
    // file già assente
  }
}

/** Copia da bucket attivo ad archivio e rimuove l'originale. */
export async function moveToArchive(
  activeKey: string,
  archiveKey: string
): Promise<void> {
  const src = bucketPath(BUCKET_ACTIVE, activeKey);
  const dest = await ensureBucketDir(BUCKET_ARCHIVE, archiveKey);
  await fs.copyFile(src, dest);
  await fs.unlink(src);
}

export async function deleteFromAllBuckets(storageKey: string, archiveKey?: string | null): Promise<void> {
  await deleteFromBucket(BUCKET_ACTIVE, storageKey);
  if (archiveKey) {
    await deleteFromBucket(BUCKET_ARCHIVE, archiveKey);
  }
}
