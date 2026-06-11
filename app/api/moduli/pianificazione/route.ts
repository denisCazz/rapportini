import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { isOrgAdminRole } from '@/lib/roles';
import { assertClienteInOrg, assertUtenteInOrg } from '@/lib/tenant-context';
import { mapInterventoPianificato } from '@/lib/interventi-pianificati';
import { parseDateOnly, parseTimeForDb } from '@/lib/time-db';
import type { EventoCalendario } from '@/types';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  titolo: z.string().min(1).max(255),
  descrizione: z.string().max(2000).optional(),
  dataPianificata: z.string().min(1),
  oraPianificata: z.string().optional(),
  clienteId: z.string().uuid().optional().nullable(),
  utenteId: z.string().uuid().optional().nullable(),
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
    const auth = await requireModuleAccess(request, MODULE_CODES.PIANIFICAZIONE_INTERVENTI);
    if (!auth.ok) return auth.response;

    const { org_id: orgId, id: userId, ruolo } = auth.user;
    const dataInizio = request.nextUrl.searchParams.get('dataInizio');
    const dataFine = request.nextUrl.searchParams.get('dataFine');

    if (!dataInizio || !dataFine) {
      return NextResponse.json({ error: 'Parametri dataInizio e dataFine obbligatori' }, { status: 400 });
    }

    const inizio = parseDateOnly(dataInizio);
    const fine = parseDateOnly(dataFine);

    const pianificatiWhere =
      isOrgAdminRole(ruolo)
        ? { org_id: orgId }
        : {
            org_id: orgId,
            OR: [
              { utente_id: userId },
              { creato_da: userId },
              { utente_id: null },
            ],
          };

    const rapportiniWhere: Prisma.RapportiniWhereInput = {
      org_id: orgId,
      ...(!isOrgAdminRole(ruolo) ? { utente_id: userId } : {}),
      OR: [
        { data_intervento: { gte: inizio, lte: fine } },
        { prossimo_intervento: { gte: inizio, lte: fine } },
      ],
    };

    const [pianificati, rapportini] = await Promise.all([
      prisma.interventiPianificati.findMany({
        where: {
          ...pianificatiWhere,
          data_pianificata: { gte: inizio, lte: fine },
          stato: { not: 'annullato' },
        },
        include: interventoInclude,
        orderBy: [{ data_pianificata: 'asc' }, { ora_pianificata: 'asc' }],
      }),
      prisma.rapportini.findMany({
        where: rapportiniWhere,
        include: {
          utenti: { select: { nome: true, cognome: true } },
          clienti: { select: { nome: true, cognome: true } },
        },
        orderBy: { data_intervento: 'asc' },
      }),
    ]);

    const eventi: EventoCalendario[] = [];

    for (const row of pianificati) {
      const mapped = mapInterventoPianificato(row);
      eventi.push({
        id: `pian-${row.id}`,
        tipo: 'pianificato',
        titolo: mapped.titolo,
        data: mapped.dataPianificata,
        ora: mapped.oraPianificata,
        cliente: mapped.cliente ? `${mapped.cliente.nome} ${mapped.cliente.cognome}` : undefined,
        tecnico: mapped.tecnico ? `${mapped.tecnico.nome} ${mapped.tecnico.cognome}` : undefined,
        stato: mapped.stato,
        descrizione: mapped.descrizione,
        interventoId: row.id,
      });
    }

    for (const r of rapportini) {
      const dataInt = r.data_intervento.toISOString().slice(0, 10);
      const inRange =
        r.data_intervento >= inizio && r.data_intervento <= fine;

      if (inRange) {
        eventi.push({
          id: `rap-${r.id}`,
          tipo: 'rapportino',
          titolo: r.tipo_intervento || 'Intervento',
          data: dataInt,
          ora: r.ora_intervento.toISOString().slice(11, 16),
          cliente: `${r.clienti.nome} ${r.clienti.cognome}`,
          tecnico: r.utenti ? `${r.utenti.nome} ${r.utenti.cognome}` : undefined,
          descrizione: r.descrizione,
          rapportinoId: r.id,
        });
      }

      if (r.prossimo_intervento) {
        const dataMan = r.prossimo_intervento.toISOString().slice(0, 10);
        if (r.prossimo_intervento >= inizio && r.prossimo_intervento <= fine) {
          eventi.push({
            id: `man-${r.id}`,
            tipo: 'manutenzione',
            titolo: 'Manutenzione programmata',
            data: dataMan,
            cliente: `${r.clienti.nome} ${r.clienti.cognome}`,
            tecnico: r.utenti ? `${r.utenti.nome} ${r.utenti.cognome}` : undefined,
            descrizione: `${r.marca} ${r.modello}`,
            rapportinoId: r.id,
          });
        }
      }
    }

    eventi.sort((a, b) => a.data.localeCompare(b.data) || (a.ora || '').localeCompare(b.ora || ''));

    return NextResponse.json({
      data: {
        eventi,
        interventi: pianificati.map(mapInterventoPianificato),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching pianificazione:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero della pianificazione';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PIANIFICAZIONE_INTERVENTI);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const { titolo, descrizione, dataPianificata, oraPianificata, clienteId, utenteId } = parsed.data;

    if (clienteId) {
      const ok = await assertClienteInOrg(clienteId, auth.user.org_id);
      if (!ok) {
        return NextResponse.json({ error: 'Cliente non appartenente alla tua organizzazione' }, { status: 403 });
      }
    }

    if (utenteId) {
      const ok = await assertUtenteInOrg(utenteId, auth.user.org_id, 'operatore');
      if (!ok) {
        return NextResponse.json({ error: 'Tecnico non appartenente alla tua organizzazione' }, { status: 403 });
      }
    }

    const created = await prisma.interventiPianificati.create({
      data: {
        org_id: auth.user.org_id,
        titolo,
        descrizione: descrizione || null,
        data_pianificata: parseDateOnly(dataPianificata),
        ora_pianificata: oraPianificata ? parseTimeForDb(oraPianificata) : null,
        cliente_id: clienteId || null,
        utente_id: utenteId || null,
        creato_da: auth.user.id,
        stato: 'pianificato',
      },
      include: interventoInclude,
    });

    return NextResponse.json({ data: mapInterventoPianificato(created) }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating pianificazione:', error);
    const message = error instanceof Error ? error.message : 'Errore nella creazione';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
