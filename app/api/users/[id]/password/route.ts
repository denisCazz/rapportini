import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { changePasswordSchema, validateRequest } from '@/lib/validation';
import { z } from 'zod';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST - Cambia password utente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');
    const orgId = getOrgIdFromRequest(request);

    const isAdmin = userRole === 'admin';
    const isSelf = currentUserId === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    const body = await request.json();

    if (isAdmin) {
      const adminResetSchema = z.object({
        newPassword: z.string().min(8, 'Nuova password deve avere almeno 8 caratteri').max(100),
      });

      const validation = validateRequest(adminResetSchema, body);
      if (!validation.success) {
        return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(validation.data.newPassword, 12);

      const updated = await prisma.utenti.updateMany({
        where: { id, org_id: orgId },
        data: { password_hash: passwordHash, must_change_password: false },
      });

      if (updated.count === 0) {
        return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
      }

      void writeAuditLog({
        org_id: orgId,
        user_id: currentUserId,
        action: 'password_change',
        resource: `user:${id}`,
        ip: getClientIP(request),
        details: { by: 'admin_reset' },
      });

      return NextResponse.json({ success: true, message: 'Password resettata con successo' });
    }

    const validation = validateRequest(changePasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { currentPassword, newPassword } = validation.data;

    const utente = await prisma.utenti.findFirst({
      where: { id, org_id: orgId },
      select: { password_hash: true },
    });

    if (!utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    if (!utente.password_hash?.match(/^\$2[abxy]\$/)) {
      return NextResponse.json(
        { error: 'Password non aggiornabile: reimposta la password dal flusso di recupero.' },
        { status: 400 }
      );
    }
    const isValidPassword = await bcrypt.compare(currentPassword, utente.password_hash);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Password attuale non corretta' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.utenti.updateMany({
      where: { id, org_id: orgId },
      data: { password_hash: passwordHash, must_change_password: false },
    });

    void writeAuditLog({
      org_id: orgId,
      user_id: id,
      action: 'password_change',
      resource: `user:${id}`,
      ip: getClientIP(request),
      details: { by: 'self' },
    });

    return NextResponse.json({ success: true, message: 'Password cambiata con successo' });
  } catch (error: unknown) {
    console.error('Error changing password:', error);
    const message = error instanceof Error ? error.message : 'Errore nel cambio password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
