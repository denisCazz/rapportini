import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { assertClienteInOrg } from '@/lib/tenant-context';
import { mapClienteContatto } from '@/lib/planner-clienti';

export const dynamic = 'force-dynamic';

const contattoSchema = z.object({
  nome: z.string().min(1).max(255),
  ruolo: z.string().max(100).optional(),
  telefono: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  principale: z.boolean().optional(),
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
    const parsed = contattoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    if (parsed.data.principale) {
      await prisma.clienteContatti.updateMany({
        where: { cliente_id: id, org_id: auth.user.org_id },
        data: { principale: false, updated_at: new Date() },
      });
    }

    const contatto = await prisma.clienteContatti.create({
      data: {
        org_id: auth.user.org_id,
        cliente_id: id,
        nome: parsed.data.nome,
        ruolo: parsed.data.ruolo,
        telefono: parsed.data.telefono,
        email: parsed.data.email,
        principale: parsed.data.principale ?? false,
      },
    });

    return NextResponse.json({ data: mapClienteContatto(contatto) }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating cliente contatto:', error);
    const message = error instanceof Error ? error.message : 'Errore nella creazione del contatto';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PLANNER);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const contattoId = request.nextUrl.searchParams.get('contattoId');
    if (!contattoId) {
      return NextResponse.json({ error: 'contattoId obbligatorio' }, { status: 400 });
    }

    const inOrg = await assertClienteInOrg(id, auth.user.org_id);
    if (!inOrg) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    const deleted = await prisma.clienteContatti.deleteMany({
      where: { id: contattoId, cliente_id: id, org_id: auth.user.org_id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting cliente contatto:', error);
    const message = error instanceof Error ? error.message : 'Errore nell\'eliminazione del contatto';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
