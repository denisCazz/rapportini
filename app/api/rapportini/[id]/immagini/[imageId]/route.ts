import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { assertRapportinoAccess } from '@/lib/rapportino-immagini';
import { readFromBucket, deleteFromAllBuckets } from '@/lib/media-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string; imageId: string }> };

// GET - Serve l'immagine (autenticato, org-scoped)
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: rapportinoId, imageId } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const access = await assertRapportinoAccess(rapportinoId, orgId, userId, userRole);
    if (!access) {
      return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 404 });
    }

    const immagine = await prisma.rapportinoImmagini.findFirst({
      where: { id: imageId, rapportino_id: rapportinoId, org_id: orgId },
    });

    if (!immagine) {
      return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 });
    }

    const buffer = await readFromBucket(immagine.bucket, immagine.storage_key);
    if (!buffer) {
      return NextResponse.json({ error: 'File non trovato nello storage' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': immagine.mime_type,
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: unknown) {
    console.error('Error serving immagine:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel recupero immagine' },
      { status: 500 }
    );
  }
}

// DELETE - Rimuovi immagine
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: rapportinoId, imageId } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const access = await assertRapportinoAccess(rapportinoId, orgId, userId, userRole);
    if (!access) {
      return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 403 });
    }

    const immagine = await prisma.rapportinoImmagini.findFirst({
      where: { id: imageId, rapportino_id: rapportinoId, org_id: orgId },
    });

    if (!immagine) {
      return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 });
    }

    await deleteFromAllBuckets(immagine.storage_key);
    await prisma.rapportinoImmagini.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting immagine:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore nell'eliminazione immagine" },
      { status: 500 }
    );
  }
}
