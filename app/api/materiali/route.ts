import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest } from '@/lib/api-auth';

// GET - Ottieni materiali filtrati per modello
export async function GET(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const modelloId = searchParams.get('modello_id');

    if (!modelloId) {
      return NextResponse.json({ error: "L'ID del modello è obbligatorio" }, { status: 400 });
    }

    const modelloOwner = await prisma.modelli.findFirst({
      where: { id: modelloId, org_id: orgId },
      select: { id: true },
    });

    if (!modelloOwner) {
      return NextResponse.json({ error: 'Modello non trovato per la società corrente' }, { status: 404 });
    }

    const materiali = await prisma.materiali.findMany({
      where: { org_id: orgId, modello_id: modelloId },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, descrizione: true, modello_id: true },
    });

    return NextResponse.json(materiali);
  } catch (error: unknown) {
    console.error('Error fetching materiali:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero dei materiali';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Crea un nuovo materiale
export async function POST(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const body = await request.json();
    const { nome, descrizione, modello_id } = body;

    if (!nome || !nome.trim()) {
      return NextResponse.json({ error: 'Il nome del materiale è obbligatorio' }, { status: 400 });
    }

    if (!modello_id) {
      return NextResponse.json({ error: "L'ID del modello è obbligatorio" }, { status: 400 });
    }

    const modelloOwner = await prisma.modelli.findFirst({
      where: { id: modello_id, org_id: orgId },
      select: { id: true },
    });

    if (!modelloOwner) {
      return NextResponse.json({ error: 'Modello non trovato per la società corrente' }, { status: 404 });
    }

    const trimmed = nome.trim();
    const desc = descrizione?.trim() || null;

    try {
      const materiale = await prisma.materiali.create({
        data: {
          nome: trimmed,
          descrizione: desc,
          modello_id,
          org_id: orgId,
        },
        select: { id: true, nome: true, descrizione: true, modello_id: true },
      });
      return NextResponse.json(materiale);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        const existing = await prisma.materiali.findFirst({
          where: { org_id: orgId, nome: trimmed, modello_id },
          select: { id: true, nome: true, descrizione: true, modello_id: true },
        });
        if (existing) return NextResponse.json(existing);
      }
      throw e;
    }
  } catch (error: unknown) {
    console.error('Error creating materiale:', error);
    const message = error instanceof Error ? error.message : 'Errore nella creazione del materiale';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
