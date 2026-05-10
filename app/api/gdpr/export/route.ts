import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserIdFromRequest, getOrgIdFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET - Esporta dati personali dell'utente (diritto di accesso GDPR Art. 15)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const utente = await prisma.utenti.findFirst({
      where: { id: userId, org_id: orgId },
      select: {
        id: true,
        username: true,
        nome: true,
        cognome: true,
        email: true,
        telefono: true,
        qualifica: true,
        ruolo: true,
        created_at: true,
        ultimo_accesso: true,
      },
    });

    if (!utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    const rapportini = await prisma.rapportini.findMany({
      where: { utente_id: userId, org_id: orgId },
      orderBy: { data_intervento: 'desc' },
      take: 500,
      select: {
        id: true,
        data_intervento: true,
        ora_intervento: true,
        tipo_stufa: true,
        tipo_intervento: true,
        clienti: { select: { nome: true, cognome: true, indirizzo: true, citta: true } },
      },
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      dataSubject: "Dati personali dell'utente",
      user: {
        id: utente.id,
        username: utente.username,
        nome: utente.nome,
        cognome: utente.cognome,
        email: utente.email || null,
        telefono: utente.telefono || null,
        qualifica: utente.qualifica || null,
        ruolo: utente.ruolo,
        dataRegistrazione: utente.created_at,
        ultimoAccesso: utente.ultimo_accesso || null,
      },
      rapportiniCreati: rapportini.map((r) => ({
        id: r.id,
        data: r.data_intervento.toISOString().slice(0, 10),
        ora: typeof r.ora_intervento === 'string' ? r.ora_intervento : r.ora_intervento.toISOString().slice(11, 19),
        tipoStufa: r.tipo_stufa,
        tipoIntervento: r.tipo_intervento,
        cliente: r.clienti
          ? `${r.clienti.nome} ${r.clienti.cognome} - ${r.clienti.indirizzo}, ${r.clienti.citta}`
          : null,
      })),
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="dati-personali-${utente.username}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: unknown) {
    console.error('GDPR export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore nell'esportazione" },
      { status: 500 }
    );
  }
}
