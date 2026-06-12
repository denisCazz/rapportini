import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { mapDbRowToRapportino } from '@/lib/rapportino-db';
import { sendInterventoConfirmation, sendEmail } from '@/lib/email';
import { isOrgAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const sendSchema = z.object({
  tipo: z.enum(['rapportino', 'preventivo']).default('rapportino'),
  rapportinoId: z.string().uuid().optional(),
  preventivoId: z.string().uuid().optional(),
  email: z.string().email().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.REPORT_CLIENTE);
    if (!auth.ok) return auth.response;

    const rapportinoId = request.nextUrl.searchParams.get('rapportinoId');

    const invii = await prisma.reportClienteInvii.findMany({
      where: {
        org_id: auth.user.org_id,
        ...(rapportinoId ? { rapportino_id: rapportinoId } : {}),
        ...(!isOrgAdminRole(auth.user.ruolo) ? { utente_id: auth.user.id } : {}),
      },
      orderBy: { inviato_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      data: invii.map((row) => ({
        id: row.id,
        tipo: row.tipo_documento,
        rapportinoId: row.rapportino_id,
        preventivoId: row.preventivo_id,
        email: row.email_destinatario,
        stato: row.stato,
        errore: row.errore,
        inviatoAt: row.inviato_at?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error('GET invia-documentazione error:', error);
    return NextResponse.json({ error: 'Errore caricamento invii' }, { status: 500 });
  }
}

function buildPreventivoEmail(
  numero: string,
  titolo: string | null,
  clienteLabel: string,
  totale: number,
  validoFino: string | null,
  note: string | null,
  righe: Array<{ descrizione: string | null; quantita: number; prezzo_unitario: number; tipo: string }>,
  aziendaNome: string
): { subject: string; html: string; text: string } {
  const subject = `Preventivo ${numero}${titolo ? ` — ${titolo}` : ''}`;
  const rows = righe
    .map(
      (r) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${r.descrizione || '-'}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${r.quantita}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">€${(r.quantita * r.prezzo_unitario).toFixed(2)}</td></tr>`
    )
    .join('');
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#222;max-width:640px;margin:0 auto">
  <h2 style="color:#b91c1c">${aziendaNome}</h2>
  <p>Gentile ${clienteLabel || 'Cliente'},</p>
  <p>in allegato trovi il preventivo <strong>${numero}</strong>${titolo ? ` per <strong>${titolo}</strong>` : ''}.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead>
      <tr style="background:#f3f4f6"><th style="padding:6px 8px;text-align:left">Voce</th><th style="padding:6px 8px">Q.tà</th><th style="padding:6px 8px;text-align:right">Importo</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="3" style="padding:8px">Nessuna voce</td></tr>'}</tbody>
  </table>
  <p style="font-size:18px"><strong>Totale: €${totale.toFixed(2)}</strong></p>
  ${validoFino ? `<p>Valido fino al: ${validoFino}</p>` : ''}
  ${note ? `<p><strong>Note:</strong><br/>${note.replace(/\n/g, '<br/>')}</p>` : ''}
  <p style="color:#666;font-size:13px;margin-top:24px">Per accettare il preventivo o per qualsiasi chiarimento, rispondi a questa email.</p>
</body>
</html>`;
  const text = `${subject}\n\nTotale: €${totale.toFixed(2)}${validoFino ? `\nValido fino al: ${validoFino}` : ''}${note ? `\n\nNote:\n${note}` : ''}`;
  return { subject, html, text };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.REPORT_CLIENTE);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }

    const org = await prisma.organizzazioni.findFirst({
      where: { org_id: auth.user.org_id },
      select: { nome_azienda: true },
    });
    const aziendaNome = org?.nome_azienda || 'Bitora';

    // ---- Invio PREVENTIVO ----
    if (parsed.data.tipo === 'preventivo') {
      if (!parsed.data.preventivoId) {
        return NextResponse.json({ error: 'Preventivo non specificato' }, { status: 400 });
      }
      const prev = await prisma.preventivi.findFirst({
        where: {
          id: parsed.data.preventivoId,
          org_id: auth.user.org_id,
          ...(!isOrgAdminRole(auth.user.ruolo) ? { utente_id: auth.user.id } : {}),
        },
        include: { clienti: true, righe: true },
      });
      if (!prev) {
        return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 });
      }

      const email = parsed.data.email || prev.cliente_email || prev.clienti?.email || undefined;
      if (!email) {
        return NextResponse.json({ error: 'Email destinatario mancante' }, { status: 400 });
      }

      const clienteLabel = prev.clienti
        ? `${prev.clienti.nome} ${prev.clienti.cognome}`.trim()
        : prev.cliente_nome || '';
      const { subject, html, text } = buildPreventivoEmail(
        prev.numero,
        prev.titolo,
        clienteLabel,
        Number(prev.totale),
        prev.valido_fino?.toISOString().slice(0, 10) ?? null,
        prev.note,
        prev.righe.map((r) => ({
          descrizione: r.descrizione,
          quantita: Number(r.quantita),
          prezzo_unitario: Number(r.prezzo_unitario),
          tipo: r.tipo,
        })),
        aziendaNome
      );

      const ok = await sendEmail({ to: email, subject, html, text });

      await prisma.reportClienteInvii.create({
        data: {
          org_id: auth.user.org_id,
          tipo_documento: 'preventivo',
          preventivo_id: prev.id,
          utente_id: auth.user.id,
          email_destinatario: email,
          stato: ok ? 'inviato' : 'errore',
          errore: ok ? null : 'Invio email non riuscito',
        },
      });

      if (!ok) {
        return NextResponse.json({ error: 'Invio email non riuscito' }, { status: 502 });
      }
      return NextResponse.json({ data: { success: true } });
    }

    // ---- Invio RAPPORTINO ----
    if (!parsed.data.rapportinoId) {
      return NextResponse.json({ error: 'Rapportino non specificato' }, { status: 400 });
    }

    const where: { id: string; org_id: string; utente_id?: string } = {
      id: parsed.data.rapportinoId,
      org_id: auth.user.org_id,
    };
    if (!isOrgAdminRole(auth.user.ruolo)) {
      where.utente_id = auth.user.id;
    }

    const row = await prisma.rapportini.findFirst({
      where,
      include: {
        utenti: { select: { nome: true, cognome: true, telefono: true, email: true, qualifica: true } },
        clienti: true,
      },
    });

    if (!row) {
      return NextResponse.json({ error: 'Rapportino non trovato' }, { status: 404 });
    }

    const rapportino = mapDbRowToRapportino(row);
    const email = parsed.data.email || rapportino.cliente.email;
    if (!email) {
      return NextResponse.json({ error: 'Email destinatario mancante' }, { status: 400 });
    }

    rapportino.cliente.email = email;
    const result = await sendInterventoConfirmation(rapportino, aziendaNome);

    await prisma.reportClienteInvii.create({
      data: {
        org_id: auth.user.org_id,
        tipo_documento: 'rapportino',
        rapportino_id: row.id,
        utente_id: auth.user.id,
        email_destinatario: email,
        stato: result.success ? 'inviato' : 'errore',
        errore: result.success ? null : result.message,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    return NextResponse.json({ data: { success: true, message: result.message } });
  } catch (error) {
    console.error('POST invia-documentazione error:', error);
    return NextResponse.json({ error: 'Errore invio documentazione' }, { status: 500 });
  }
}
