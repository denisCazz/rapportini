import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserIdFromRequest, getOrgIdFromRequest } from '@/lib/api-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// DELETE - Cancella account richiesta (diritto all'oblio GDPR Art. 17)
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { password, confirm } = body;

    if (!password || !confirm || confirm !== 'ELIMINA') {
      return NextResponse.json(
        { error: 'Conferma richiesta: invia password e confirm: "ELIMINA" nel body' },
        { status: 400 }
      );
    }

    const utente = await prisma.utenti.findFirst({
      where: { id: userId, org_id: orgId },
      select: { id: true, username: true, password_hash: true, ruolo: true },
    });

    if (!utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    const bcrypt = await import('bcryptjs');
    if (!utente.password_hash?.match(/^\$2[abxy]\$/)) {
      return NextResponse.json({ error: 'Password non aggiornabile' }, { status: 400 });
    }
    const passwordValid = await bcrypt.compare(password, utente.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Password non corretta' }, { status: 401 });
    }

    if (utente.ruolo === 'admin') {
      const adminCount = await prisma.utenti.count({
        where: { org_id: orgId, ruolo: 'admin', attivo: true },
      });
      if (adminCount === 1) {
        return NextResponse.json(
          { error: "Impossibile eliminare: sei l'unico admin. Assegna un altro admin prima di procedere." },
          { status: 400 }
        );
      }
    }

    const rapportiniCount = await prisma.rapportini.count({
      where: { utente_id: userId },
    });

    if (rapportiniCount > 0) {
      return NextResponse.json(
        {
          error: `Hai ${rapportiniCount} rapportini creati. Contatta l'amministratore per riassegnarli prima di eliminare l'account.`,
        },
        { status: 400 }
      );
    }

    await prisma.utenti.updateMany({
      where: { id: userId, org_id: orgId },
      data: {
        attivo: false,
        email: null,
        telefono: null,
        qualifica: null,
        updated_at: new Date(),
      },
    });

    void writeAuditLog({
      org_id: orgId,
      user_id: userId,
      action: 'account_deactivate',
      resource: 'gdpr',
      ip: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Account disattivato. I dati saranno cancellati definitivamente secondo la policy di retention.',
    });
  } catch (error: unknown) {
    console.error('GDPR delete account error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella cancellazione' },
      { status: 500 }
    );
  }
}
