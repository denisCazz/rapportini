import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { assertClienteInOrg, assertUtenteInOrg } from '@/lib/tenant-context';
import { mapInterventoPianificato } from '@/lib/interventi-pianificati';
import { parseDateOnly, parseTimeForDb } from '@/lib/time-db';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  titolo: z.string().min(1).max(255).optional(),
  descrizione: z.string().max(2000).optional().nullable(),
  dataPianificata: z.string().optional(),
  oraPianificata: z.string().optional().nullable(),
  clienteId: z.string().uuid().optional().nullable(),
  utenteId: z.string().uuid().optional().nullable(),
  stato: z.enum(['pianificato', 'completato', 'annullato']).optional(),
});

const interventoInclude = {
  clienti: {
    select: { id: true, nome: true, cognome: true, citta: true, telefono: true },
  },
  utenti: {
    select: { id: true, nome: true, cognome: true },
  },
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PIANIFICAZIONE_INTERVENTI);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const existing = await prisma.interventiPianificati.findFirst({
      where: { id, org_id: auth.user.org_id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 });
    }

    const d = parsed.data;

    if (d.clienteId) {
      const ok = await assertClienteInOrg(d.clienteId, auth.user.org_id);
      if (!ok) {
        return NextResponse.json({ error: 'Cliente non appartenente alla tua organizzazione' }, { status: 403 });
      }
    }

    if (d.utenteId) {
      const ok = await assertUtenteInOrg(d.utenteId, auth.user.org_id, 'operatore');
      if (!ok) {
        return NextResponse.json({ error: 'Tecnico non appartenente alla tua organizzazione' }, { status: 403 });
      }
    }
    const updated = await prisma.interventiPianificati.update({
      where: { id },
      data: {
        ...(d.titolo !== undefined && { titolo: d.titolo }),
        ...(d.descrizione !== undefined && { descrizione: d.descrizione }),
        ...(d.dataPianificata !== undefined && { data_pianificata: parseDateOnly(d.dataPianificata) }),
        ...(d.oraPianificata !== undefined && {
          ora_pianificata: d.oraPianificata ? parseTimeForDb(d.oraPianificata) : null,
        }),
        ...(d.clienteId !== undefined && { cliente_id: d.clienteId }),
        ...(d.utenteId !== undefined && { utente_id: d.utenteId }),
        ...(d.stato !== undefined && { stato: d.stato }),
        updated_at: new Date(),
      },
      include: interventoInclude,
    });

    return NextResponse.json({ data: mapInterventoPianificato(updated) });
  } catch (error: unknown) {
    console.error('Error updating pianificazione:', error);
    const message = error instanceof Error ? error.message : 'Errore nell\'aggiornamento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PIANIFICAZIONE_INTERVENTI);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await prisma.interventiPianificati.findFirst({
      where: { id, org_id: auth.user.org_id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 });
    }

    await prisma.interventiPianificati.update({
      where: { id },
      data: { stato: 'annullato', updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting pianificazione:', error);
    const message = error instanceof Error ? error.message : 'Errore nell\'eliminazione';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
