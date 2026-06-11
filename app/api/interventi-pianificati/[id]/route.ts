import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';
import {
  buildRapportinoPrefillFromIntervento,
  canAccessInterventoPianificato,
} from '@/lib/intervento-pianificato-prefill';

export const dynamic = 'force-dynamic';

const clienteSelect = {
  id: true,
  nome: true,
  cognome: true,
  ragione_sociale: true,
  via: true,
  numero_civico: true,
  indirizzo: true,
  citta: true,
  cap: true,
  provincia: true,
  telefono: true,
  email: true,
  partita_iva: true,
  codice_fiscale: true,
} as const;

const updateSchema = z.object({
  stato: z.enum(['completato']),
});

async function loadIntervento(id: string, orgId: string) {
  return prisma.interventiPianificati.findFirst({
    where: { id, org_id: orgId, stato: { not: 'annullato' } },
    select: {
      id: true,
      titolo: true,
      descrizione: true,
      data_pianificata: true,
      ora_pianificata: true,
      stato: true,
      utente_id: true,
      creato_da: true,
      clienti: { select: clienteSelect },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) return tenant.response;

    const { id } = await params;
    const row = await loadIntervento(id, tenant.user.org_id);
    if (!row) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 });
    }

    if (!canAccessInterventoPianificato(row, tenant.user)) {
      return NextResponse.json({ error: 'Non autorizzato su questo intervento' }, { status: 403 });
    }

    const prefill = buildRapportinoPrefillFromIntervento(row);

    return NextResponse.json({
      data: {
        interventoId: row.id,
        titolo: row.titolo,
        stato: row.stato,
        prefill,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching intervento prefill:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) return tenant.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const row = await loadIntervento(id, tenant.user.org_id);
    if (!row) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 });
    }

    if (!canAccessInterventoPianificato(row, tenant.user)) {
      return NextResponse.json({ error: 'Non autorizzato su questo intervento' }, { status: 403 });
    }

    await prisma.interventiPianificati.update({
      where: { id },
      data: { stato: parsed.data.stato, updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating intervento:', error);
    const message = error instanceof Error ? error.message : 'Errore nell\'aggiornamento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
