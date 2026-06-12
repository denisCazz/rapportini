import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';

const updateSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  giacenza: z.number().int().min(0).optional(),
  sogliaMinima: z.number().int().min(0).optional(),
  prezzoUnitario: z.number().min(0).optional().nullable(),
  scarico: z.number().int().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.MAGAZZINO_RICAMBI);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }

    const existing = await prisma.magazzinoRicambi.findFirst({
      where: { id, org_id: auth.user.org_id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Ricambio non trovato' }, { status: 404 });
    }

    const d = parsed.data;
    let giacenza = existing.giacenza;
    if (d.scarico) giacenza = Math.max(0, giacenza - d.scarico);
    if (d.giacenza !== undefined) giacenza = d.giacenza;

    const updated = await prisma.magazzinoRicambi.update({
      where: { id },
      data: {
        ...(d.nome !== undefined && { nome: d.nome }),
        ...(d.sogliaMinima !== undefined && { soglia_minima: d.sogliaMinima }),
        ...(d.prezzoUnitario !== undefined && { prezzo_unitario: d.prezzoUnitario }),
        giacenza,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        giacenza: updated.giacenza,
        sottoSoglia: updated.giacenza <= updated.soglia_minima,
      },
    });
  } catch (error) {
    console.error('PATCH magazzino error:', error);
    return NextResponse.json({ error: 'Errore aggiornamento' }, { status: 500 });
  }
}
