import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { updateUserSchema, validateRequest } from '@/lib/validation';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { isCatAdmin, isOrgAdminRole } from '@/lib/roles';
import { writeAuditLog } from '@/lib/audit-log';
import { getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const userSelectPublic = {
  id: true,
  username: true,
  ruolo: true,
  nome: true,
  cognome: true,
  telefono: true,
  email: true,
  qualifica: true,
  firma: true,
  attivo: true,
  ultimo_accesso: true,
  created_at: true,
} as const;

// GET - Ottieni singolo utente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');
    const orgId = getOrgIdFromRequest(request);

    if (!isOrgAdminRole(userRole) && currentUserId !== id) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    const utente = await prisma.utenti.findFirst({
      where: { id, org_id: orgId },
      select: userSelectPublic,
    });

    if (!utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    return NextResponse.json({ data: utente });
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    const message = error instanceof Error ? error.message : "Errore nel recupero dell'utente";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Aggiorna utente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');
    const orgId = getOrgIdFromRequest(request);

    const isAdmin = isOrgAdminRole(userRole);
    const isSelf = currentUserId === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    const body = await request.json();

    const validation = validateRequest(updateUserSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const raw = validation.data as Record<string, unknown>;
    const updateData: Record<string, unknown> = { ...raw };

    if (!isAdmin) {
      delete updateData.ruolo;
      delete updateData.attivo;
    }

    if (isSelf && updateData.attivo === false) {
      return NextResponse.json({ error: 'Non puoi disattivare il tuo account' }, { status: 400 });
    }

    const prismaData: {
      nome?: string;
      cognome?: string;
      email?: string | null;
      telefono?: string | null;
      qualifica?: string | null;
      firma?: string | null;
      attivo?: boolean;
      ruolo?: string;
    } = {};

    if (updateData.nome !== undefined) prismaData.nome = updateData.nome as string;
    if (updateData.cognome !== undefined) prismaData.cognome = updateData.cognome as string;
    if (updateData.email !== undefined) prismaData.email = (updateData.email as string) || null;
    if (updateData.telefono !== undefined) prismaData.telefono = (updateData.telefono as string) || null;
    if (updateData.qualifica !== undefined) prismaData.qualifica = (updateData.qualifica as string) || null;
    if (updateData.firma !== undefined) prismaData.firma = (updateData.firma as string) || null;
    if (updateData.attivo !== undefined) prismaData.attivo = updateData.attivo as boolean;
    if (updateData.ruolo !== undefined) prismaData.ruolo = updateData.ruolo as string;

    const existing = await prisma.utenti.findFirst({ where: { id, org_id: orgId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    const updatedUser = await prisma.utenti.update({
      where: { id },
      data: prismaData,
      select: {
        id: true,
        username: true,
        ruolo: true,
        nome: true,
        cognome: true,
        telefono: true,
        email: true,
        qualifica: true,
        firma: true,
        attivo: true,
      },
    });

    return NextResponse.json({ data: updatedUser, success: true });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    const message = error instanceof Error ? error.message : "Errore nell'aggiornamento dell'utente";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Elimina utente (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');
    const orgId = getOrgIdFromRequest(request);

    if (!isOrgAdminRole(userRole)) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    if (currentUserId === id) {
      return NextResponse.json({ error: 'Non puoi eliminare il tuo account' }, { status: 400 });
    }

    const userToDelete = await prisma.utenti.findFirst({
      where: { id, org_id: orgId },
      select: { ruolo: true },
    });

    if (isCatAdmin(userRole) && userToDelete?.ruolo !== 'operatore') {
      return NextResponse.json(
        { error: 'Gli amministratori CAT possono eliminare solo operatori' },
        { status: 403 }
      );
    }

    const adminCount = await prisma.utenti.count({
      where: { org_id: orgId, ruolo: { in: ['admin', 'admin_cat'] }, attivo: true },
    });

    if (
      (userToDelete?.ruolo === 'admin' || userToDelete?.ruolo === 'admin_cat') &&
      adminCount <= 1
    ) {
      return NextResponse.json({ error: "Non puoi eliminare l'ultimo amministratore" }, { status: 400 });
    }

    await prisma.utenti.deleteMany({
      where: { id, org_id: orgId },
    });

    void writeAuditLog({
      org_id: orgId,
      user_id: currentUserId,
      action: 'user_delete',
      resource: `user:${id}`,
      ip: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    const message = error instanceof Error ? error.message : "Errore nell'eliminazione dell'utente";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
