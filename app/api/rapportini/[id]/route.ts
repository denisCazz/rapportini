import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { isOrgAdminRole } from '@/lib/roles';
import { Rapportino } from '@/types';
import { syncDatabaseSchema } from '@/lib/db-schema-sync';
import {
  mapClienteToDbData,
  mapDbRowToRapportino,
  mapInterventoToDbData,
} from '@/lib/rapportino-db';
import { deleteAllImmaginiStorage } from '@/lib/rapportino-immagini';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Ottieni un singolo rapportino
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await syncDatabaseSchema();

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
    if (!isOrgAdminRole(userRole)) {
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

    const response = NextResponse.json(mapDbRowToRapportino(rapportino));
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

    if (!isOrgAdminRole(userRole)) {
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
        data: mapClienteToDbData(rapportino.cliente, orgId),
        select: { id: true },
      });
      clienteId = newCliente.id;
    }

    const interventoData = mapInterventoToDbData(rapportino.intervento);

    await prisma.rapportini.updateMany({
      where: { id, org_id: orgId },
      data: {
        cliente_id: clienteId,
        ...interventoData,
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

    if (!isOrgAdminRole(userRole)) {
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

    await deleteAllImmaginiStorage(id, orgId);
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
