import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { MODULE_CODES } from '@/lib/modules';
import { syncDatabaseSchema } from '@/lib/db-schema-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await syncDatabaseSchema();

    const pianificazione = await requireModuleAccess(request, MODULE_CODES.PIANIFICAZIONE_INTERVENTI);
    if (pianificazione.ok) {
      const tecnici = await prisma.utenti.findMany({
        where: { org_id: pianificazione.user.org_id, ruolo: 'operatore', attivo: true },
        select: { id: true, nome: true, cognome: true, qualifica: true },
        orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      });
      return NextResponse.json({ data: tecnici });
    }

    const assegnazione = await requireModuleAccess(request, MODULE_CODES.ASSEGNAZIONE_LAVORI);
    if (assegnazione.ok) {
      const tecnici = await prisma.utenti.findMany({
        where: { org_id: assegnazione.user.org_id, ruolo: 'operatore', attivo: true },
        select: { id: true, nome: true, cognome: true, qualifica: true },
        orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      });
      return NextResponse.json({ data: tecnici });
    }

    return pianificazione.response;
  } catch (error: unknown) {
    console.error('Error fetching tecnici:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero tecnici';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
