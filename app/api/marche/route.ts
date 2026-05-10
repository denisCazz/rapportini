import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { catalogNomeBodySchema } from '@/lib/validation';

// GET - Ottieni tutte le marche
export async function GET(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const marche = await prisma.marche.findMany({
      where: { org_id: orgId },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    });

    return NextResponse.json(marche);
  } catch (error: unknown) {
    console.error('Error fetching marche:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero delle marche';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Crea una nuova marca
export async function POST(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const json = await request.json();
    const parsed = catalogNomeBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dati non validi' }, { status: 400 });
    }
    const trimmed = parsed.data.nome;

    try {
      const marca = await prisma.marche.create({
        data: { nome: trimmed, org_id: orgId },
        select: { id: true, nome: true },
      });
      return NextResponse.json(marca);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        const existing = await prisma.marche.findFirst({
          where: { org_id: orgId, nome: trimmed },
          select: { id: true, nome: true },
        });
        if (existing) return NextResponse.json(existing);
      }
      throw e;
    }
  } catch (error: unknown) {
    console.error('Error creating marca:', error);
    const message = error instanceof Error ? error.message : 'Errore nella creazione della marca';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
