import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { mapInterventoPianificato } from '@/lib/interventi-pianificati';
import type { TecnicoCaricoLavoro } from '@/types';

export const dynamic = 'force-dynamic';

const assignSchema = z.object({
  interventoId: z.string().uuid(),
  utenteId: z.string().uuid().nullable(),
});

const interventoInclude = {
  clienti: {
    select: { id: true, nome: true, cognome: true, citta: true, telefono: true },
  },
  utenti: {
    select: { id: true, nome: true, cognome: true },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.ASSEGNAZIONE_LAVORI);
    if (!auth.ok) return auth.response;

    const { org_id: orgId } = auth.user;
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const [tecnici, interventi] = await Promise.all([
      prisma.utenti.findMany({
        where: { org_id: orgId, ruolo: 'operatore', attivo: true },
        select: { id: true, nome: true, cognome: true, qualifica: true },
        orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      }),
      prisma.interventiPianificati.findMany({
        where: {
          org_id: orgId,
          stato: 'pianificato',
          data_pianificata: { gte: oggi },
        },
        include: interventoInclude,
        orderBy: [{ data_pianificata: 'asc' }, { ora_pianificata: 'asc' }],
      }),
    ]);

    const nonAssegnati = interventi
      .filter((i) => !i.utente_id)
      .map(mapInterventoPianificato);

    const carichi: TecnicoCaricoLavoro[] = tecnici.map((t) => {
      const assegnati = interventi
        .filter((i) => i.utente_id === t.id)
        .map(mapInterventoPianificato);
      return {
        id: t.id,
        nome: t.nome,
        cognome: t.cognome,
        qualifica: t.qualifica || undefined,
        interventi: assegnati,
        totale: assegnati.length,
      };
    });

    return NextResponse.json({
      data: {
        tecnici: carichi,
        nonAssegnati,
        totaleInterventi: interventi.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching assegnazione:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero assegnazioni';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.ASSEGNAZIONE_LAVORI);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const { interventoId, utenteId } = parsed.data;

    const existing = await prisma.interventiPianificati.findFirst({
      where: { id: interventoId, org_id: auth.user.org_id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 });
    }

    if (utenteId) {
      const tecnico = await prisma.utenti.findFirst({
        where: { id: utenteId, org_id: auth.user.org_id, ruolo: 'operatore', attivo: true },
      });
      if (!tecnico) {
        return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 });
      }
    }

    const updated = await prisma.interventiPianificati.update({
      where: { id: interventoId },
      data: { utente_id: utenteId, updated_at: new Date() },
      include: interventoInclude,
    });

    return NextResponse.json({ data: mapInterventoPianificato(updated) });
  } catch (error: unknown) {
    console.error('Error assigning lavoro:', error);
    const message = error instanceof Error ? error.message : 'Errore nell\'assegnazione';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
