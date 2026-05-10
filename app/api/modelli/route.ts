import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { modelloCreateBodySchema } from '@/lib/validation';

// GET - Ottieni modelli filtrati per marca
export async function GET(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const marcaId = searchParams.get('marca_id');

    const modelli = await prisma.modelli.findMany({
      where: {
        org_id: orgId,
        ...(marcaId ? { marca_id: marcaId } : {}),
      },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, marca_id: true },
    });

    return NextResponse.json(modelli);
  } catch (error: unknown) {
    console.error('Error fetching modelli:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero dei modelli';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Crea un nuovo modello
export async function POST(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const json = await request.json();
    const parsed = modelloCreateBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dati non validi' }, { status: 400 });
    }
    const { nome: trimmed, marca_id } = parsed.data;

    const marcaOwner = await prisma.marche.findFirst({
      where: { id: marca_id, org_id: orgId },
      select: { id: true },
    });

    if (!marcaOwner) {
      return NextResponse.json({ error: 'Marca non trovata per la società corrente' }, { status: 404 });
    }

    try {
      const modello = await prisma.modelli.create({
        data: { nome: trimmed, marca_id, org_id: orgId },
        select: { id: true, nome: true, marca_id: true },
      });
      return NextResponse.json(modello);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        const existing = await prisma.modelli.findFirst({
          where: { org_id: orgId, nome: trimmed, marca_id },
          select: { id: true, nome: true, marca_id: true },
        });
        if (existing) return NextResponse.json(existing);
      }
      throw e;
    }
  } catch (error: unknown) {
    console.error('Error creating modello:', error);
    const message = error instanceof Error ? error.message : 'Errore nella creazione del modello';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
