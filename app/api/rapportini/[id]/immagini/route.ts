import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import {
  ALLOWED_MIME_TYPES,
  BUCKET_ACTIVE,
  MAX_IMAGES_PER_RAPPORTINO,
  MAX_UPLOAD_BYTES,
} from '@/lib/media-config';
import { compressImage } from '@/lib/image-compress';
import {
  buildActiveStorageKey,
  deleteFromBucket,
  writeToBucket,
} from '@/lib/media-storage';
import {
  assertRapportinoAccess,
  countActiveImages,
  getImmaginiForRapportino,
  mapDbRowToImmagine,
} from '@/lib/rapportino-immagini';
import { checkRateLimit, createRateLimitKey, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

// GET - Elenco immagini del rapportino
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const access = await assertRapportinoAccess(id, orgId, userId, userRole);
    if (!access) {
      return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 404 });
    }

    const immagini = await getImmaginiForRapportino(id, orgId);
    const data = immagini.map((img) => ({
      ...img,
      url: `/api/rapportini/${id}/immagini/${img.id}`,
    }));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('Error listing immagini:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel recupero immagini' },
      { status: 500 }
    );
  }
}

// POST - Carica immagine (opzionale, max 5 per rapportino)
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: rapportinoId } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(
      createRateLimitKey('upload-immagine', `${getClientIP(request)}:${userId}`),
      { maxRequests: 20, windowMs: 60 * 1000 }
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra poco.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) } }
      );
    }

    const access = await assertRapportinoAccess(rapportinoId, orgId, userId, userRole);
    if (!access) {
      return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 403 });
    }

    const currentCount = await countActiveImages(rapportinoId, orgId);
    if (currentCount >= MAX_IMAGES_PER_RAPPORTINO) {
      return NextResponse.json(
        { error: `Massimo ${MAX_IMAGES_PER_RAPPORTINO} immagini per rapportino` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File immagine mancante' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Formato non supportato (JPEG, PNG, WebP, HEIC)' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File troppo grande (max 10 MB)' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressImage(inputBuffer, file.type);

    const imageId = randomUUID();
    const storageKey = buildActiveStorageKey(orgId, rapportinoId, imageId, compressed.extension);

    await writeToBucket(BUCKET_ACTIVE, storageKey, compressed.buffer);

    const caption = formData.get('caption');
    const captionStr = typeof caption === 'string' && caption.trim() ? caption.trim().slice(0, 500) : null;

    let row;
    try {
      row = await prisma.rapportinoImmagini.create({
        data: {
          id: imageId,
          org_id: orgId,
          rapportino_id: rapportinoId,
          storage_key: storageKey,
          bucket: BUCKET_ACTIVE,
          mime_type: compressed.mimeType,
          size_bytes: BigInt(compressed.buffer.length),
          caption: captionStr,
          uploaded_by: userId,
        },
      });
    } catch (dbError) {
      await deleteFromBucket(BUCKET_ACTIVE, storageKey);
      throw dbError;
    }

    const immagine = mapDbRowToImmagine(row);
    return NextResponse.json({
      data: {
        ...immagine,
        url: `/api/rapportini/${rapportinoId}/immagini/${immagine.id}`,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error uploading immagine:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel caricamento immagine' },
      { status: 500 }
    );
  }
}
