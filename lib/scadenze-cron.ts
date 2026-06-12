import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const REMINDER_DAYS = [7, 3, 1];

function giorniTra(oggi: Date, scadenza: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const o = new Date(oggi.toISOString().slice(0, 10) + 'T12:00:00.000Z');
  const s = new Date(scadenza.toISOString().slice(0, 10) + 'T12:00:00.000Z');
  return Math.round((s.getTime() - o.getTime()) / msPerDay);
}

export async function runScadenzeEmailReminders(): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const rapportini = await prisma.rapportini.findMany({
    where: { prossimo_intervento: { not: null } },
    include: {
      clienti: { select: { nome: true, cognome: true, email: true, telefono: true } },
      utenti: { select: { id: true, nome: true, cognome: true, email: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of rapportini) {
    if (!r.prossimo_intervento || !r.utenti) continue;

    const giorni = giorniTra(oggi, r.prossimo_intervento);
    if (!REMINDER_DAYS.includes(giorni) && giorni >= 0) {
      skipped++;
      continue;
    }
    if (giorni < 0) {
      skipped++;
      continue;
    }

    const dataScadenza = r.prossimo_intervento.toISOString().slice(0, 10);
    const already = await prisma.scadenzeNotificate.findFirst({
      where: {
        rapportino_id: r.id,
        utente_id: r.utenti.id,
        data_scadenza: r.prossimo_intervento,
        canale: 'email',
      },
    });
    if (already) {
      skipped++;
      continue;
    }

    const destinatario = r.utenti.email || r.clienti.email;
    if (!destinatario) {
      skipped++;
      continue;
    }

    const dataLabel = format(r.prossimo_intervento, 'dd MMMM yyyy', { locale: it });
    const subject =
      giorni === 0
        ? `Manutenzione stufa oggi — ${r.clienti.nome} ${r.clienti.cognome}`
        : `Promemoria manutenzione tra ${giorni} giorni — ${r.clienti.nome} ${r.clienti.cognome}`;

    const html = `
      <p>Ciao ${r.utenti.nome},</p>
      <p>Promemoria: manutenzione programmata per <strong>${r.clienti.nome} ${r.clienti.cognome}</strong>
      (${r.marca} ${r.modello}) in data <strong>${dataLabel}</strong>.</p>
      <p>Telefono cliente: ${r.clienti.telefono}</p>
    `;

    const ok = await sendEmail({ to: destinatario, subject, html, text: subject });

    if (ok) {
      await prisma.scadenzeNotificate.create({
        data: {
          org_id: r.org_id,
          rapportino_id: r.id,
          utente_id: r.utenti.id,
          data_scadenza: r.prossimo_intervento,
          canale: 'email',
          email_destinatario: destinatario,
        },
      });
      sent++;
    } else {
      errors++;
    }
  }

  return { sent, skipped, errors };
}
