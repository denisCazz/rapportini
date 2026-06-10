import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { syncDatabaseSchema } from '@/lib/db-schema-sync';
import { parseDateOnly } from '@/lib/time-db';
import type { ScadenzaManutenzione, UrgenzaScadenza } from '@/types';

export const dynamic = 'force-dynamic';

const notifySchema = z.object({
  rapportinoId: z.string().uuid(),
  dataScadenza: z.string().min(1),
});

function calcolaUrgenza(giorniRimanenti: number): UrgenzaScadenza {
  if (giorniRimanenti < 0) return 'scaduto';
  if (giorniRimanenti <= 7) return 'urgente';
  if (giorniRimanenti <= 30) return 'prossimo';
  return 'ok';
}

function giorniTra(oggi: Date, scadenza: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const o = new Date(oggi.toISOString().slice(0, 10) + 'T12:00:00.000Z');
  const s = new Date(scadenza.toISOString().slice(0, 10) + 'T12:00:00.000Z');
  return Math.round((s.getTime() - o.getTime()) / msPerDay);
}

export async function GET(request: NextRequest) {
  try {
    await syncDatabaseSchema();
    const auth = await requireModuleAccess(request, MODULE_CODES.NOTIFICHE_SCADENZE);
    if (!auth.ok) return auth.response;

    const { org_id: orgId, id: userId, ruolo } = auth.user;
    const filtro = request.nextUrl.searchParams.get('filtro') || 'tutti';

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const rapportini = await prisma.rapportini.findMany({
      where: {
        org_id: orgId,
        ...(ruolo !== 'admin' ? { utente_id: userId } : {}),
        prossimo_intervento: { not: null },
      },
      include: {
        clienti: {
          select: { nome: true, cognome: true, citta: true, telefono: true },
        },
        utenti: {
          select: { nome: true, cognome: true },
        },
      },
      orderBy: { prossimo_intervento: 'asc' },
    });

    const notifiche = await prisma.scadenzeNotificate.findMany({
      where: { org_id: orgId, utente_id: userId },
      select: { rapportino_id: true, data_scadenza: true },
    });

    const notificatiSet = new Set(
      notifiche.map((n) => `${n.rapportino_id}:${n.data_scadenza.toISOString().slice(0, 10)}`)
    );

    let scadenze: ScadenzaManutenzione[] = rapportini
      .filter((r) => r.prossimo_intervento)
      .map((r) => {
        const dataScadenza = r.prossimo_intervento!.toISOString().slice(0, 10);
        const giorniRimanenti = giorniTra(oggi, r.prossimo_intervento!);
        const urgenza = calcolaUrgenza(giorniRimanenti);
        return {
          rapportinoId: r.id,
          dataScadenza,
          giorniRimanenti,
          urgenza,
          notificato: notificatiSet.has(`${r.id}:${dataScadenza}`),
          cliente: {
            nome: r.clienti.nome,
            cognome: r.clienti.cognome,
            citta: r.clienti.citta,
            telefono: r.clienti.telefono,
          },
          stufa: {
            tipo: r.tipo_stufa,
            marca: r.marca,
            modello: r.modello,
          },
          ultimoIntervento: r.data_intervento.toISOString().slice(0, 10),
          operatore: {
            nome: r.utenti?.nome || '',
            cognome: r.utenti?.cognome || '',
          },
        };
      });

    if (filtro === 'scaduti') {
      scadenze = scadenze.filter((s) => s.urgenza === 'scaduto');
    } else if (filtro === 'urgenti') {
      scadenze = scadenze.filter((s) => s.urgenza === 'urgente' || s.urgenza === 'scaduto');
    } else if (filtro === 'prossimi') {
      scadenze = scadenze.filter((s) => s.urgenza === 'prossimo');
    } else if (filtro === 'non_notificati') {
      scadenze = scadenze.filter((s) => !s.notificato && s.urgenza !== 'ok');
    }

    const riepilogo = {
      totale: scadenze.length,
      scaduti: scadenze.filter((s) => s.urgenza === 'scaduto').length,
      urgenti: scadenze.filter((s) => s.urgenza === 'urgente').length,
      prossimi: scadenze.filter((s) => s.urgenza === 'prossimo').length,
      nonNotificati: scadenze.filter((s) => !s.notificato && s.urgenza !== 'ok').length,
    };

    return NextResponse.json({ data: { scadenze, riepilogo } });
  } catch (error: unknown) {
    console.error('Error fetching scadenze:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero scadenze';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await syncDatabaseSchema();
    const auth = await requireModuleAccess(request, MODULE_CODES.NOTIFICHE_SCADENZE);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = notifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const { rapportinoId, dataScadenza } = parsed.data;

    const rapportino = await prisma.rapportini.findFirst({
      where: { id: rapportinoId, org_id: auth.user.org_id },
    });
    if (!rapportino) {
      return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 404 });
    }

    await prisma.scadenzeNotificate.upsert({
      where: {
        rapportino_id_utente_id_data_scadenza: {
          rapportino_id: rapportinoId,
          utente_id: auth.user.id,
          data_scadenza: parseDateOnly(dataScadenza),
        },
      },
      create: {
        org_id: auth.user.org_id,
        rapportino_id: rapportinoId,
        utente_id: auth.user.id,
        data_scadenza: parseDateOnly(dataScadenza),
      },
      update: {
        notificato_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error marking scadenza:', error);
    const message = error instanceof Error ? error.message : 'Errore nella notifica';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
