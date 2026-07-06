import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { assertClienteInOrg } from '@/lib/tenant-context';
import { mapClienteNota } from '@/lib/planner-clienti';

export const dynamic = 'force-dynamic';

const noteSchema = z.object({
  testo: z.string().min(1).max(2000),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PLANNER);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const inOrg = await assertClienteInOrg(id, auth.user.org_id);
    if (!inOrg) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const nota = await prisma.clienteNote.create({
      data: {
        org_id: auth.user.org_id,
        cliente_id: id,
        utente_id: auth.user.id,
        testo: parsed.data.testo,
      },
    });

    return NextResponse.json({ data: mapClienteNota(nota) }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating cliente note:', error);
    const message = error instanceof Error ? error.message : 'Errore nella creazione della nota';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
