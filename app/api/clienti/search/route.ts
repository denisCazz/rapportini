import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgIdFromRequest } from '@/lib/api-auth';

// GET - Cerca clienti esistenti per nome e cognome
export async function GET(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const nome = searchParams.get('nome')?.trim();
    const cognome = searchParams.get('cognome')?.trim();

    if (!nome || !cognome) {
      return NextResponse.json([]);
    }

    // Cerca clienti con nome e cognome simili (case-insensitive)
    const { data: clienti, error } = await supabase
      .from('clienti')
      .select('id, nome, cognome, ragione_sociale, indirizzo, citta, cap, telefono, email')
      .eq('org_id', orgId)
      .ilike('nome', `%${nome}%`)
      .ilike('cognome', `%${cognome}%`)
      .limit(10)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Errore nella ricerca clienti:', error);
      throw error;
    }

    // Formatta i risultati
    const risultati = (clienti || []).map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      cognome: cliente.cognome,
      ragioneSociale: cliente.ragione_sociale || '',
      indirizzo: cliente.indirizzo,
      citta: cliente.citta,
      cap: cliente.cap,
      telefono: cliente.telefono,
      email: cliente.email || '',
    }));

    return NextResponse.json(risultati);
  } catch (error: any) {
    console.error('Error searching clienti:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nella ricerca clienti' },
      { status: 500 }
    );
  }
}

