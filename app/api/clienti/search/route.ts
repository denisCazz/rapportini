import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOrgIdFromRequest } from '@/lib/api-auth';

// GET - Cerca clienti esistenti per nome e cognome
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const orgId = getOrgIdFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const nome = searchParams.get('nome')?.trim();
    const cognome = searchParams.get('cognome')?.trim();
    const q = searchParams.get('q')?.trim();

    if (!nome && !cognome && !q) {
      return NextResponse.json([]);
    }

    // Cerca clienti con query flessibile su nome/cognome (case-insensitive)
    let query = supabase
      .from('clienti')
      .select('id, nome, cognome, ragione_sociale, indirizzo, citta, cap, telefono, email, partita_iva, codice_fiscale')
      .eq('org_id', orgId)
      .limit(10);

    if (q) {
      query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%`);
    }

    if (nome) {
      query = query.ilike('nome', `%${nome}%`);
    }

    if (cognome) {
      query = query.ilike('cognome', `%${cognome}%`);
    }

    const { data: clienti, error } = await query
      .order('cognome', { ascending: true })
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
      partitaIva: cliente.partita_iva || '',
      codiceFiscale: cliente.codice_fiscale || '',
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

