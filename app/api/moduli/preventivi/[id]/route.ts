import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
const updateSchema = z.object({
  stato: z.enum(['bozza', 'inviato', 'accettato', 'rifiutato']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PREVENTIVI);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }

    const preventivo = await prisma.preventivi.findFirst({
      where: { id, org_id: auth.user.org_id },
      include: { righe: true, clienti: true },
    });
    if (!preventivo) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 });
    }

    if (parsed.data.stato === 'accettato' && !preventivo.rapportino_id) {
      if (!preventivo.cliente_id) {
        return NextResponse.json(
          { error: 'Aggiungi un cliente al preventivo prima di convertirlo in rapportino' },
          { status: 400 }
        );
      }
      const materiali = preventivo.righe
        .filter((r) => r.tipo === 'materiale')
        .map((r) => `${r.descrizione ?? ''} x${r.quantita}`)
        .join(', ');

      const rapportino = await prisma.rapportini.create({
        data: {
          org_id: auth.user.org_id,
          utente_id: auth.user.id,
          cliente_id: preventivo.cliente_id,
          data_intervento: new Date(),
          ora_intervento: new Date('1970-01-01T09:00:00.000Z'),
          tipo_stufa: 'pellet',
          marca: 'Da preventivo',
          modello: preventivo.numero,
          tipo_intervento: 'Intervento da preventivo',
          descrizione: `Generato da preventivo ${preventivo.numero}.${preventivo.note ? `\n${preventivo.note}` : ''}`,
          materiali_utilizzati: materiali || null,
        },
      });

      const updated = await prisma.preventivi.update({
        where: { id },
        data: {
          stato: 'accettato',
          rapportino_id: rapportino.id,
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        data: {
          id: updated.id,
          stato: updated.stato,
          rapportinoId: rapportino.id,
        },
      });
    }

    const updated = await prisma.preventivi.update({
      where: { id },
      data: {
        ...(parsed.data.stato && { stato: parsed.data.stato }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ data: { id: updated.id, stato: updated.stato } });
  } catch (error) {
    console.error('PATCH preventivo error:', error);
    return NextResponse.json({ error: 'Errore aggiornamento preventivo' }, { status: 500 });
  }
}
