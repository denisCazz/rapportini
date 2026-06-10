import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';

function mapCliente(cliente: {
  id: string;
  nome: string;
  cognome: string;
  ragione_sociale: string | null;
  via: string | null;
  numero_civico: string | null;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string | null;
  telefono: string;
  email: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  created_at: Date | null;
}) {
  return {
    id: cliente.id,
    nome: cliente.nome,
    cognome: cliente.cognome,
    ragioneSociale: cliente.ragione_sociale || '',
    via: cliente.via || '',
    numeroCivico: cliente.numero_civico || '',
    indirizzo: cliente.indirizzo,
    citta: cliente.citta,
    cap: cliente.cap,
    provincia: cliente.provincia || '',
    telefono: cliente.telefono,
    email: cliente.email || '',
    partitaIva: cliente.partita_iva || '',
    codiceFiscale: cliente.codice_fiscale || '',
    dataRegistrazione: cliente.created_at?.toISOString().slice(0, 10) || null,
  };
}

// GET - Elenco clienti con statistiche dai rapportini compilati dagli operatori (solo admin)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
    }

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo gli admin possono visualizzare i clienti.' },
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
        tipologia_intervento: true,
        marca: true,
        modello: true,
        cliente_id: true,
        utente_id: true,
        clienti: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            ragione_sociale: true,
            via: true,
            numero_civico: true,
            indirizzo: true,
            citta: true,
            cap: true,
            provincia: true,
            telefono: true,
            email: true,
            partita_iva: true,
            codice_fiscale: true,
            created_at: true,
          },
        },
        utenti: {
          select: {
            id: true,
            nome: true,
            cognome: true,
          },
        },
      },
    });

    const clientiMap = new Map<
      string,
      {
        cliente: ReturnType<typeof mapCliente>;
        rapportini: Array<{
          id: string;
          dataIntervento: string;
          tipoStufa: string;
          tipoIntervento: string;
          tipologiaIntervento: string;
          marca: string;
          modello: string;
          operatore: { id: string; nome: string; cognome: string };
        }>;
        statistiche: {
          totale: number;
          pellet: number;
          legno: number;
          ultimoIntervento: string | null;
          primoIntervento: string | null;
          tipiIntervento: Record<string, number>;
          marche: Record<string, number>;
        };
        operatori: Map<string, { id: string; nome: string; cognome: string; count: number }>;
      }
    >();

    rapportini.forEach((rapportino) => {
      const cliente = rapportino.clienti;
      if (!cliente?.id) return;

      const clienteId = cliente.id;

      if (!clientiMap.has(clienteId)) {
        clientiMap.set(clienteId, {
          cliente: mapCliente(cliente),
          rapportini: [],
          statistiche: {
            totale: 0,
            pellet: 0,
            legno: 0,
            ultimoIntervento: null,
            primoIntervento: null,
            tipiIntervento: {},
            marche: {},
          },
          operatori: new Map(),
        });
      }

      const clienteData = clientiMap.get(clienteId)!;
      const stats = clienteData.statistiche;
      const operatore = rapportino.utenti;

      clienteData.rapportini.push({
        id: rapportino.id,
        dataIntervento: rapportino.data_intervento.toISOString().slice(0, 10),
        tipoStufa: rapportino.tipo_stufa,
        tipoIntervento: rapportino.tipo_intervento,
        tipologiaIntervento: rapportino.tipologia_intervento || '',
        marca: rapportino.marca,
        modello: rapportino.modello,
        operatore: {
          id: operatore.id,
          nome: operatore.nome,
          cognome: operatore.cognome,
        },
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

      stats.tipiIntervento[rapportino.tipo_intervento] =
        (stats.tipiIntervento[rapportino.tipo_intervento] || 0) + 1;

      if (rapportino.marca) {
        stats.marche[rapportino.marca] = (stats.marche[rapportino.marca] || 0) + 1;
      }

      const operatoreKey = operatore.id;
      const existingOperatore = clienteData.operatori.get(operatoreKey);
      if (existingOperatore) {
        existingOperatore.count++;
      } else {
        clienteData.operatori.set(operatoreKey, {
          id: operatore.id,
          nome: operatore.nome,
          cognome: operatore.cognome,
          count: 1,
        });
      }
    });

    const clienti = Array.from(clientiMap.values())
      .map((entry) => ({
        cliente: entry.cliente,
        rapportini: entry.rapportini,
        statistiche: entry.statistiche,
        operatori: Array.from(entry.operatori.values()).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.statistiche.totale - a.statistiche.totale);

    const totaleRapportini = rapportini.length;
    const totaleClienti = clienti.length;
    const annoCorrente = new Date().getFullYear();
    const clientiConInterventoAnno = clienti.filter((c) =>
      c.rapportini.some((r) => new Date(r.dataIntervento).getFullYear() === annoCorrente)
    ).length;

    const cittaCount = new Map<string, number>();
    clienti.forEach((c) => {
      const citta = c.cliente.citta || 'N/D';
      cittaCount.set(citta, (cittaCount.get(citta) || 0) + 1);
    });
    const cittaPrincipali = Array.from(cittaCount.entries())
      .map(([citta, count]) => ({ citta, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const summary = {
      totaleClienti,
      totaleRapportini,
      totalePellet: clienti.reduce((sum, c) => sum + c.statistiche.pellet, 0),
      totaleLegno: clienti.reduce((sum, c) => sum + c.statistiche.legno, 0),
      clientiConInterventoAnno,
      mediaRapportiniPerCliente: totaleClienti > 0 ? Math.round((totaleRapportini / totaleClienti) * 10) / 10 : 0,
      cittaPrincipali,
    };

    const response = NextResponse.json({ summary, clienti });
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching clienti admin:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero dei clienti';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
