import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { isOrgAdminRole } from '@/lib/roles';

// GET - Ottieni statistiche raggruppate per cliente (solo admin)
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

    const rapportini = await prisma.rapportini.findMany({
      where: { org_id: orgId },
      orderBy: { data_intervento: 'desc' },
      select: {
        id: true,
        data_intervento: true,
        tipo_stufa: true,
        tipo_intervento: true,
        cliente_id: true,
        clienti: {
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
        },
      },
    });

    if (!rapportini.length) {
      return NextResponse.json([]);
    }

    const clientiMap = new Map<string, Record<string, unknown>>();

    rapportini.forEach((rapportino) => {
      const cliente = rapportino.clienti;
      if (!cliente?.id) return;

      const clienteId = cliente.id;

      if (!clientiMap.has(clienteId)) {
        clientiMap.set(clienteId, {
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
          rapportini: [] as unknown[],
          statistiche: {
            totale: 0,
            pellet: 0,
            legno: 0,
            ultimoIntervento: null as string | null,
            primoIntervento: null as string | null,
            tipiIntervento: {} as Record<string, number>,
          },
        });
      }

      const clienteData = clientiMap.get(clienteId)!;
      const stats = clienteData.statistiche as {
        totale: number;
        pellet: number;
        legno: number;
        ultimoIntervento: string | null;
        primoIntervento: string | null;
        tipiIntervento: Record<string, number>;
      };

      (clienteData.rapportini as unknown[]).push({
        id: rapportino.id,
        dataIntervento: rapportino.data_intervento.toISOString().slice(0, 10),
        tipoStufa: rapportino.tipo_stufa,
        tipoIntervento: rapportino.tipo_intervento,
      });

      stats.totale++;
      if (rapportino.tipo_stufa === 'pellet') {
        stats.pellet++;
      } else {
        stats.legno++;
      }

      const dataStr = rapportino.data_intervento.toISOString().slice(0, 10);
      const dataIntervento = new Date(rapportino.data_intervento);
      if (!stats.ultimoIntervento || dataIntervento > new Date(stats.ultimoIntervento)) {
        stats.ultimoIntervento = dataStr;
      }
      if (!stats.primoIntervento || dataIntervento < new Date(stats.primoIntervento)) {
        stats.primoIntervento = dataStr;
      }

      stats.tipiIntervento[rapportino.tipo_intervento] = (stats.tipiIntervento[rapportino.tipo_intervento] || 0) + 1;
    });

    const statistiche = Array.from(clientiMap.values()).sort(
      (a, b) =>
        (b.statistiche as { totale: number }).totale - (a.statistiche as { totale: number }).totale
    );

    const response = NextResponse.json(statistiche);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching statistics:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero delle statistiche';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
