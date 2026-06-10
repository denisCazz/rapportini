import sharp from 'sharp';
import { ALLOWED_MIME_TYPES } from '@/lib/media-config';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 72;

export interface CompressedImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

/** Comprime l'immagine in JPEG con qualità contenuta (max 1600px lato lungo). */
export async function compressImage(input: Buffer, mimeType: string): Promise<CompressedImage> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Formato immagine non supportato');
  }

  const pipeline = sharp(input, { failOn: 'none' })
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

  const buffer = await pipeline.toBuffer();

  return {
    buffer,
    mimeType: 'image/jpeg',
    extension: 'jpg',
  };
}
