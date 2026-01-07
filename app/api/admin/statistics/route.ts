import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/api-auth';

// GET - Ottieni statistiche raggruppate per cliente (solo admin)
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione e ruolo admin
    const userId = getUserIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json(
        { error: 'Autenticazione richiesta' },
        { status: 401 }
      );
    }

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo gli admin possono visualizzare le statistiche.' },
        { status: 403 }
      );
    }
    // Ottieni tutti i rapportini con dati cliente
    const { data: rapportini, error } = await supabase
      .from('rapportini')
      .select(`
        id,
        data_intervento,
        tipo_stufa,
        tipo_intervento,
        cliente_id,
        cliente:clienti(
          id,
          nome,
          cognome,
          ragione_sociale,
          indirizzo,
          citta,
          cap,
          telefono,
          email
        )
      `)
      .order('data_intervento', { ascending: false });

    if (error) {
      throw error;
    }

    // Verifica che ci siano rapportini
    if (!rapportini || rapportini.length === 0) {
      return NextResponse.json([]);
    }

    // Raggruppa per cliente usando l'ID cliente come chiave
    const clientiMap = new Map<string, any>();

    rapportini.forEach((rapportino: any) => {
      // Salta rapportini senza cliente
      if (!rapportino.cliente || !rapportino.cliente.id) {
        return;
      }

      const cliente = rapportino.cliente;
      const clienteId = cliente.id;
      
      // Usa l'ID cliente come chiave per il raggruppamento
      if (!clientiMap.has(clienteId)) {
        // Crea un nuovo gruppo cliente
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
          rapportini: [],
          statistiche: {
            totale: 0,
            pellet: 0,
            legno: 0,
            ultimoIntervento: null,
            primoIntervento: null,
            tipiIntervento: {} as Record<string, number>,
          },
        });
      }

      const clienteData = clientiMap.get(clienteId);
      if (!clienteData) {
        return;
      }

      // Aggiungi il rapportino al gruppo
      clienteData.rapportini.push({
        id: rapportino.id,
        dataIntervento: rapportino.data_intervento,
        tipoStufa: rapportino.tipo_stufa,
        tipoIntervento: rapportino.tipo_intervento,
      });

      // Aggiorna statistiche
      clienteData.statistiche.totale++;
      if (rapportino.tipo_stufa === 'pellet') {
        clienteData.statistiche.pellet++;
      } else {
        clienteData.statistiche.legno++;
      }

      const dataIntervento = new Date(rapportino.data_intervento);
      if (!clienteData.statistiche.ultimoIntervento || dataIntervento > new Date(clienteData.statistiche.ultimoIntervento)) {
        clienteData.statistiche.ultimoIntervento = rapportino.data_intervento;
      }
      if (!clienteData.statistiche.primoIntervento || dataIntervento < new Date(clienteData.statistiche.primoIntervento)) {
        clienteData.statistiche.primoIntervento = rapportino.data_intervento;
      }

      clienteData.statistiche.tipiIntervento[rapportino.tipo_intervento] = 
        (clienteData.statistiche.tipiIntervento[rapportino.tipo_intervento] || 0) + 1;
    });

    // Converti Map in array e ordina per totale rapportini (decrescente)
    const statistiche = Array.from(clientiMap.values()).sort(
      (a, b) => b.statistiche.totale - a.statistiche.totale
    );

    const response = NextResponse.json(statistiche);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero delle statistiche' },
      { status: 500 }
    );
  }
}
