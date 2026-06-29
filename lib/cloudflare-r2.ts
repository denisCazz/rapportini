import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  prefix: string;
}

export function getR2ConfigFromEnv(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    prefix: (process.env.R2_BACKUP_PREFIX || 'bitora').replace(/^\/+|\/+$/g, ''),
  };
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadFileToR2(
  client: S3Client,
  config: R2Config,
  localPath: string,
  objectKey: string,
  contentType?: string
): Promise<void> {
  const fileStat = await stat(localPath);
  const body = createReadStream(localPath);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Body: body,
      ContentLength: fileStat.size,
      ContentType: contentType,
    })
  );
}

export async function pruneOldR2Backups(
  client: S3Client,
  config: R2Config,
  retentionDays: number
): Promise<number> {
  if (retentionDays <= 0) return 0;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const prefix = `${config.prefix}/`;
  let continuationToken: string | undefined;
  const keysToDelete: string[] = [];

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents ?? []) {
      if (!item.Key || !item.LastModified) continue;
      if (item.LastModified.getTime() < cutoff) {
        keysToDelete.push(item.Key);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  if (keysToDelete.length === 0) return 0;

  // R2/S3 delete in batches of 1000
  for (let i = 0; i < keysToDelete.length; i += 1000) {
    const batch = keysToDelete.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucketName,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
        },
      })
    );
  }

  return keysToDelete.length;
}

export function buildBackupObjectKey(config: R2Config, stamp: string, fileName: string): string {
  return path.posix.join(config.prefix, stamp, fileName);
}
