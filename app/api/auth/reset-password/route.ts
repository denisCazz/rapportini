import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { writeAuditLog } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token mancante o non valido' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'La password deve avere almeno 8 caratteri' }, { status: 400 });
    }

    const resetRow = await prisma.passwordResetTokens.findFirst({
      where: { token },
      select: { id: true, user_id: true, expires_at: true, used_at: true },
    });

    if (!resetRow) {
      return NextResponse.json({ error: 'Token non valido o scaduto' }, { status: 400 });
    }

    if (resetRow.used_at) {
      return NextResponse.json({ error: 'Questo link è già stato utilizzato' }, { status: 400 });
    }

    if (resetRow.expires_at < new Date()) {
      return NextResponse.json({ error: 'Il link è scaduto. Richiedi un nuovo reset.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const userRow = await prisma.utenti.findUnique({
      where: { id: resetRow.user_id },
      select: { org_id: true },
    });

    await prisma.$transaction([
      prisma.utenti.update({
        where: { id: resetRow.user_id },
        data: { password_hash: passwordHash, must_change_password: false },
      }),
      prisma.passwordResetTokens.update({
        where: { id: resetRow.id },
        data: { used_at: new Date() },
      }),
    ]);

    void writeAuditLog({
      org_id: userRow?.org_id || 'default',
      user_id: resetRow.user_id,
      action: 'password_reset',
      resource: 'token',
    });

    return NextResponse.json({
      success: true,
      message: 'Password aggiornata con successo',
    });
  } catch (error: unknown) {
    console.error('reset-password:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel reset' },
      { status: 500 }
    );
  }
}
