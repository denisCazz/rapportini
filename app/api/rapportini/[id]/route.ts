import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { Rapportino } from '@/types';
import { parseTimeForDb, parseDateOnly } from '@/lib/time-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatOra(ora: Date): string {
  if (typeof ora === 'string') return ora;
  return ora.toISOString().slice(11, 19);
}

function formatData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toRapportino(r: {
  id: string;
  data_intervento: Date;
  ora_intervento: Date;
  tipo_stufa: string;
  marca: string;
  modello: string;
  numero_serie: string | null;
  tipo_intervento: string;
  descrizione: string;
  materiali_utilizzati: string | null;
  note: string | null;
  firma_operatore: string | null;
  firma_cliente: string | null;
  data_creazione: Date | null;
  created_at: Date | null;
  utenti: {
    nome: string;
    cognome: string;
    telefono: string | null;
    email: string | null;
    qualifica: string | null;
  } | null;
  clienti: {
    nome: string;
    cognome: string;
    ragione_sociale: string | null;
    indirizzo: string;
    citta: string;
    cap: string;
    telefono: string;
    email: string | null;
    partita_iva: string | null;
    codice_fiscale: string | null;
  };
}): Rapportino {
  return {
    id: r.id,
    operatore: {
      nome: r.utenti?.nome || '',
      cognome: r.utenti?.cognome || '',
      telefono: r.utenti?.telefono || '',
      email: r.utenti?.email || '',
      qualifica: r.utenti?.qualifica || '',
    },
    cliente: {
      nome: r.clienti.nome,
      cognome: r.clienti.cognome,
      ragioneSociale: r.clienti.ragione_sociale || '',
      indirizzo: r.clienti.indirizzo,
      citta: r.clienti.citta,
      cap: r.clienti.cap,
      telefono: r.clienti.telefono,
      email: r.clienti.email || '',
      partitaIva: r.clienti.partita_iva || '',
      codiceFiscale: r.clienti.codice_fiscale || '',
    },
    intervento: {
      data: formatData(r.data_intervento),
      ora: formatOra(r.ora_intervento),
      tipoStufa: r.tipo_stufa as 'pellet' | 'legno',
      marca: r.marca,
      modello: r.modello,
      numeroSerie: r.numero_serie || '',
      tipoIntervento: r.tipo_intervento,
      descrizione: r.descrizione,
      materialiUtilizzati: r.materiali_utilizzati || '',
      note: r.note || '',
      firmaOperatore: r.firma_operatore || '',
      firmaCliente: r.firma_cliente || '',
    },
    dataCreazione: (r.data_creazione || r.created_at || new Date()).toISOString(),
  };
}

// GET - Ottieni un singolo rapportino
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'ID utente non fornito. Effettua il login.' }, { status: 401 });
    }

    const where: { id: string; org_id: string; utente_id?: string } = {
      id,
      org_id: orgId,
    };
    if (userRole !== 'admin') {
      where.utente_id = userId;
    }

    const rapportino = await prisma.rapportini.findFirst({
      where,
      include: {
        utenti: { select: { nome: true, cognome: true, telefono: true, email: true, qualifica: true } },
        clienti: true,
      },
    });

    if (!rapportino) {
      return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 404 });
    }

    const response = NextResponse.json(toRapportino(rapportino));
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching rapportino:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero del rapportino';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Modifica un rapportino
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'ID utente non fornito. Effettua il login.' }, { status: 401 });
    }

    if (userRole !== 'admin') {
      const existing = await prisma.rapportini.findFirst({
        where: { id, org_id: orgId },
        select: { utente_id: true, cliente_id: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 404 });
      }

      if (existing.utente_id !== userId) {
        return NextResponse.json({ error: 'Non hai i permessi per modificare questo rapportino' }, { status: 403 });
      }
    }

    const body = await request.json();
    const rapportino = body.rapportino as Rapportino;

    if (!rapportino?.cliente || !rapportino?.intervento) {
      return NextResponse.json({ error: 'Dati rapportino non validi' }, { status: 400 });
    }

    const nomeNormalizzato = rapportino.cliente.nome.trim();
    const cognomeNormalizzato = rapportino.cliente.cognome.trim();
    const telefonoNormalizzato = rapportino.cliente.telefono.trim().replace(/\s/g, '');

    let clienteId: string;
    const clienteEsistente = await prisma.clienti.findFirst({
      where: {
        org_id: orgId,
        nome: nomeNormalizzato,
        cognome: cognomeNormalizzato,
        telefono: telefonoNormalizzato,
      },
      select: { id: true },
    });

    if (clienteEsistente) {
      clienteId = clienteEsistente.id;
    } else {
      const newCliente = await prisma.clienti.create({
        data: {
          org_id: orgId,
          nome: nomeNormalizzato,
          cognome: cognomeNormalizzato,
          ragione_sociale: rapportino.cliente.ragioneSociale?.trim() || null,
          indirizzo: rapportino.cliente.indirizzo.trim(),
          citta: rapportino.cliente.citta.trim(),
          cap: rapportino.cliente.cap.trim(),
          telefono: telefonoNormalizzato,
          email: rapportino.cliente.email?.trim() || null,
          partita_iva: rapportino.cliente.partitaIva?.trim() || null,
          codice_fiscale: rapportino.cliente.codiceFiscale?.trim() || null,
        },
        select: { id: true },
      });
      clienteId = newCliente.id;
    }

    await prisma.rapportini.updateMany({
      where: { id, org_id: orgId },
      data: {
        cliente_id: clienteId,
        data_intervento: parseDateOnly(rapportino.intervento.data),
        ora_intervento: parseTimeForDb(rapportino.intervento.ora),
        tipo_stufa: rapportino.intervento.tipoStufa,
        marca: rapportino.intervento.marca,
        modello: rapportino.intervento.modello,
        numero_serie: rapportino.intervento.numeroSerie?.trim() || null,
        tipo_intervento: rapportino.intervento.tipoIntervento,
        descrizione: rapportino.intervento.descrizione,
        materiali_utilizzati: rapportino.intervento.materialiUtilizzati?.trim() || null,
        note: rapportino.intervento.note?.trim() || null,
        firma_operatore: rapportino.intervento.firmaOperatore?.trim() || null,
        firma_cliente: rapportino.intervento.firmaCliente?.trim() || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating rapportino:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella modifica del rapportino' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un rapportino
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'ID utente non fornito. Effettua il login.' }, { status: 401 });
    }

    if (userRole !== 'admin') {
      const rapportino = await prisma.rapportini.findFirst({
        where: { id, org_id: orgId },
        select: { utente_id: true },
      });

      if (!rapportino) {
        return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 404 });
      }

      if (rapportino.utente_id !== userId) {
        return NextResponse.json({ error: 'Non hai i permessi per eliminare questo rapportino' }, { status: 403 });
      }
    }

    await prisma.rapportini.deleteMany({
      where: { id, org_id: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting rapportino:', error);
    const message = error instanceof Error ? error.message : "Errore nell'eliminazione del rapportino";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
