import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { assertClienteInOrg } from '@/lib/tenant-context';
import {
  mapClienteContatto,
  mapClienteNota,
  mapPlannerClienteDettaglio,
} from '@/lib/planner-clienti';
import { buildClienteAddress, geocodeAddress, approximateCityCoords } from '@/lib/planner';

export const dynamic = 'force-dynamic';

const updateClienteSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  cognome: z.string().min(1).max(255).optional(),
  telefono: z.string().min(1).max(50).optional(),
  email: z.string().email().max(255).nullable().optional(),
  indirizzo: z.string().min(1).max(500).optional(),
  citta: z.string().min(1).max(255).optional(),
  cap: z.string().min(1).max(10).optional(),
  provincia: z.string().max(10).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PLANNER);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const inOrg = await assertClienteInOrg(id, auth.user.org_id);
    if (!inOrg) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    const [cliente, contatti, note, rapportini, interventi] = await Promise.all([
      prisma.clienti.findUnique({
        where: { id },
      }),
      prisma.clienteContatti.findMany({
        where: { cliente_id: id, org_id: auth.user.org_id },
        orderBy: [{ principale: 'desc' }, { nome: 'asc' }],
      }),
      prisma.clienteNote.findMany({
        where: { cliente_id: id, org_id: auth.user.org_id },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.rapportini.findMany({
        where: { cliente_id: id, org_id: auth.user.org_id },
        orderBy: { data_intervento: 'desc' },
        take: 20,
        select: {
          id: true,
          data_intervento: true,
          tipo_intervento: true,
          marca: true,
          modello: true,
          utenti: { select: { nome: true, cognome: true } },
        },
      }),
      prisma.interventiPianificati.findMany({
        where: { cliente_id: id, org_id: auth.user.org_id, stato: 'pianificato' },
        orderBy: { data_pianificata: 'asc' },
        take: 10,
        select: { id: true, titolo: true, data_pianificata: true, stato: true },
      }),
    ]);

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    return NextResponse.json({
      data: mapPlannerClienteDettaglio(cliente, {
        contatti: contatti.map(mapClienteContatto),
        note: note.map(mapClienteNota),
        rapportini: rapportini.map((r) => ({
          id: r.id,
          dataIntervento: r.data_intervento.toISOString().slice(0, 10),
          tipoIntervento: r.tipo_intervento,
          marca: r.marca,
          modello: r.modello,
          operatore: { nome: r.utenti.nome, cognome: r.utenti.cognome },
        })),
        interventiPianificati: interventi.map((i) => ({
          id: i.id,
          titolo: i.titolo,
          dataPianificata: i.data_pianificata.toISOString().slice(0, 10),
          stato: i.stato,
        })),
      }),
    });
  } catch (error: unknown) {
    console.error('Error fetching planner cliente:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero del cliente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PLANNER);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const inOrg = await assertClienteInOrg(id, auth.user.org_id);
    if (!inOrg) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateClienteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.clienti.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    const updatedFields = {
      ...(data.nome !== undefined ? { nome: data.nome } : {}),
      ...(data.cognome !== undefined ? { cognome: data.cognome } : {}),
      ...(data.telefono !== undefined ? { telefono: data.telefono } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.indirizzo !== undefined ? { indirizzo: data.indirizzo } : {}),
      ...(data.citta !== undefined ? { citta: data.citta } : {}),
      ...(data.cap !== undefined ? { cap: data.cap } : {}),
      ...(data.provincia !== undefined ? { provincia: data.provincia } : {}),
      updated_at: new Date(),
    };

    const merged = { ...existing, ...updatedFields };
    const addressChanged =
      data.indirizzo !== undefined || data.citta !== undefined || data.cap !== undefined;

    let geocodeUpdate: { lat?: number; lng?: number; geocoded_at?: Date } = {};
    if (addressChanged) {
      const address = buildClienteAddress({
        indirizzo: merged.indirizzo,
        citta: merged.citta,
        cap: merged.cap,
        provincia: merged.provincia,
      });
      let coords = await geocodeAddress(address);
      if (!coords) coords = approximateCityCoords(merged.citta);
      if (coords) {
        geocodeUpdate = { lat: coords.lat, lng: coords.lng, geocoded_at: new Date() };
      }
    }

    const cliente = await prisma.clienti.update({
      where: { id },
      data: { ...updatedFields, ...geocodeUpdate },
    });

    if (data.note) {
      await prisma.clienteNote.create({
        data: {
          org_id: auth.user.org_id,
          cliente_id: id,
          utente_id: auth.user.id,
          testo: data.note,
        },
      });
    }

    return NextResponse.json({
      data: {
        id: cliente.id,
        nome: cliente.nome,
        cognome: cliente.cognome,
        telefono: cliente.telefono,
        email: cliente.email || undefined,
        indirizzo: cliente.indirizzo,
        citta: cliente.citta,
      },
    });
  } catch (error: unknown) {
    console.error('Error updating planner cliente:', error);
    const message = error instanceof Error ? error.message : 'Errore nell\'aggiornamento del cliente';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
