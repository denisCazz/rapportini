import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { isOrgAdminRole } from '@/lib/roles';
import { getSafeErrorMessage } from '@/lib/api-error';
import { subMonths, startOfMonth } from 'date-fns';

interface MonthlyTrendRow {
  month: string;
  pellet: number;
  legno: number;
}

// GET - Statistiche raggruppate per cliente (solo admin), con aggregazione SQL
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
    }

    if (!isOrgAdminRole(userRole)) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo gli amministratori possono visualizzare le statistiche.' },
        { status: 403 }
      );
    }

    const trendStart = startOfMonth(subMonths(new Date(), 11));

    const [clientiConRapportini, countsByCliente, tipoStufaByCliente, tipiInterventoRows, trendRows] =
      await Promise.all([
        prisma.clienti.findMany({
          where: {
            org_id: orgId,
            rapportini: { some: {} },
          },
          select: {
            id: true,
            nome: true,
            cognome: true,
            ragione_sociale: true,
            indirizzo: true,
            citta: true,
            cap: true,
            telefono: true,
            email: true,
          },
        }),
        prisma.rapportini.groupBy({
          by: ['cliente_id'],
          where: { org_id: orgId },
          _count: { _all: true },
          _min: { data_intervento: true },
          _max: { data_intervento: true },
        }),
        prisma.rapportini.groupBy({
          by: ['cliente_id', 'tipo_stufa'],
          where: { org_id: orgId },
          _count: { _all: true },
        }),
        prisma.rapportini.groupBy({
          by: ['cliente_id', 'tipo_intervento'],
          where: { org_id: orgId },
          _count: { _all: true },
        }),
        prisma.$queryRaw<Array<{ month: Date; tipo_stufa: string; count: bigint }>>`
          SELECT DATE_TRUNC('month', data_intervento) AS month, tipo_stufa, COUNT(*)::bigint AS count
          FROM rapportini
          WHERE org_id = ${orgId}
            AND data_intervento >= ${trendStart}
          GROUP BY 1, 2
          ORDER BY 1
        `,
      ]);

    if (!clientiConRapportini.length) {
      return NextResponse.json({ clienti: [], trendMensile: [] });
    }

    const countsMap = new Map(countsByCliente.map((r) => [r.cliente_id, r]));
    const tipoStufaMap = new Map<string, { pellet: number; legno: number }>();
    for (const row of tipoStufaByCliente) {
      if (!row.cliente_id) continue;
      const entry = tipoStufaMap.get(row.cliente_id) ?? { pellet: 0, legno: 0 };
      if (row.tipo_stufa === 'pellet') entry.pellet = row._count._all;
      else if (row.tipo_stufa === 'legno') entry.legno = row._count._all;
      tipoStufaMap.set(row.cliente_id, entry);
    }

    const tipiInterventoMap = new Map<string, Record<string, number>>();
    for (const row of tipiInterventoRows) {
      if (!row.cliente_id) continue;
      const entry = tipiInterventoMap.get(row.cliente_id) ?? {};
      entry[row.tipo_intervento] = row._count._all;
      tipiInterventoMap.set(row.cliente_id, entry);
    }

    const clienti = clientiConRapportini
      .map((cliente) => {
        const counts = countsMap.get(cliente.id);
        const tipoStufa = tipoStufaMap.get(cliente.id) ?? { pellet: 0, legno: 0 };
        return {
          cliente: {
            id: cliente.id,
            nome: cliente.nome,
            cognome: cliente.cognome,
            ragioneSociale: cliente.ragione_sociale || '',
            indirizzo: cliente.indirizzo,
            citta: cliente.citta,
            cap: cliente.cap,
            telefono: cliente.telefono,
            email: cliente.email || '',
          },
          rapportini: [] as Array<{
            id: string;
            dataIntervento: string;
            tipoStufa: string;
            tipoIntervento: string;
          }>,
          statistiche: {
            totale: counts?._count._all ?? 0,
            pellet: tipoStufa.pellet,
            legno: tipoStufa.legno,
            ultimoIntervento: counts?._max.data_intervento
              ? counts._max.data_intervento.toISOString().slice(0, 10)
              : null,
            primoIntervento: counts?._min.data_intervento
              ? counts._min.data_intervento.toISOString().slice(0, 10)
              : null,
            tipiIntervento: tipiInterventoMap.get(cliente.id) ?? {},
          },
        };
      })
      .sort((a, b) => b.statistiche.totale - a.statistiche.totale);

    const trendMensile: MonthlyTrendRow[] = trendRows.map((row) => ({
      month: row.month.toISOString().slice(0, 7),
      pellet: row.tipo_stufa === 'pellet' ? Number(row.count) : 0,
      legno: row.tipo_stufa === 'legno' ? Number(row.count) : 0,
    }));

    // Unifica righe per mese (groupBy SQL restituisce una riga per tipo_stufa)
    const trendByMonth = new Map<string, MonthlyTrendRow>();
    for (const row of trendMensile) {
      const existing = trendByMonth.get(row.month) ?? { month: row.month, pellet: 0, legno: 0 };
      existing.pellet += row.pellet;
      existing.legno += row.legno;
      trendByMonth.set(row.month, existing);
    }

    const response = NextResponse.json({
      clienti,
      trendMensile: Array.from(trendByMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
    });
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Errore nel recupero delle statistiche') },
      { status: 500 }
    );
  }
}
