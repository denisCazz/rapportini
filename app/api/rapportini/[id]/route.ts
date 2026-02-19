import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { Rapportino } from '@/types';

// Cache configuration per Next.js 16.1
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Ottieni un singolo rapportino
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utente non fornito. Effettua il login.' },
        { status: 401 }
      );
    }

    // Costruisci la query base
    let query = supabase
      .from('rapportini')
      .select(`
        *,
        utente:utenti(id, nome, cognome, telefono, email, qualifica),
        cliente:clienti(*)
      `)
      .eq('id', id)
      .eq('org_id', orgId);

    // Se è un operatore (non admin), verifica che il rapportino appartenga all'utente
    if (userRole !== 'admin') {
      query = query.eq('utente_id', userId);
    }

    const { data: rapportino, error } = await query.single();

    if (error || !rapportino) {
      return NextResponse.json(
        { error: 'Rapportino non trovato' },
        { status: 404 }
      );
    }

    // Trasforma i dati dal formato DB al formato dell'app
    const formattedRapportino: Rapportino = {
      id: rapportino.id,
      operatore: {
        nome: rapportino.utente?.nome || '',
        cognome: rapportino.utente?.cognome || '',
        telefono: rapportino.utente?.telefono || '',
        email: rapportino.utente?.email || '',
        qualifica: rapportino.utente?.qualifica || '',
      },
      cliente: {
        nome: rapportino.cliente.nome,
        cognome: rapportino.cliente.cognome,
        ragioneSociale: rapportino.cliente.ragione_sociale || '',
        indirizzo: rapportino.cliente.indirizzo,
        citta: rapportino.cliente.citta,
        cap: rapportino.cliente.cap,
        telefono: rapportino.cliente.telefono,
        email: rapportino.cliente.email || '',
        partitaIva: rapportino.cliente.partita_iva || '',
        codiceFiscale: rapportino.cliente.codice_fiscale || '',
      },
      intervento: {
        data: rapportino.data_intervento,
        ora: rapportino.ora_intervento,
        tipoStufa: rapportino.tipo_stufa as 'pellet' | 'legno',
        marca: rapportino.marca,
        modello: rapportino.modello,
        numeroSerie: rapportino.numero_serie || '',
        tipoIntervento: rapportino.tipo_intervento,
        descrizione: rapportino.descrizione,
        materialiUtilizzati: rapportino.materiali_utilizzati || '',
        note: rapportino.note || '',
        firmaOperatore: rapportino.firma_operatore || '',
        firmaCliente: rapportino.firma_cliente || '',
      },
      dataCreazione: rapportino.data_creazione || rapportino.created_at,
    };

    const response = NextResponse.json(formattedRapportino);
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching rapportino:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero del rapportino' },
      { status: 500 }
    );
  }
}

// PATCH - Modifica un rapportino
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utente non fornito. Effettua il login.' },
        { status: 401 }
      );
    }

    // Verifica permessi: operatore solo sui propri, admin su tutti
    if (userRole !== 'admin') {
      const { data: existing, error: fetchError } = await supabase
        .from('rapportini')
        .select('utente_id, cliente_id')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json(
          { error: 'Rapportino non trovato' },
          { status: 404 }
        );
      }

      if (existing.utente_id !== userId) {
        return NextResponse.json(
          { error: 'Non hai i permessi per modificare questo rapportino' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const rapportino = body.rapportino as Rapportino;

    if (!rapportino?.cliente || !rapportino?.intervento) {
      return NextResponse.json(
        { error: 'Dati rapportino non validi' },
        { status: 400 }
      );
    }

    // Trova o crea cliente (stessa logica del POST)
    const nomeNormalizzato = rapportino.cliente.nome.trim();
    const cognomeNormalizzato = rapportino.cliente.cognome.trim();
    const telefonoNormalizzato = rapportino.cliente.telefono.trim().replace(/\s/g, '');

    let clienteId: string;
    const { data: clienteEsistente } = await supabase
      .from('clienti')
      .select('id')
      .eq('org_id', orgId)
      .eq('nome', nomeNormalizzato)
      .eq('cognome', cognomeNormalizzato)
      .eq('telefono', telefonoNormalizzato)
      .maybeSingle();

    if (clienteEsistente) {
      clienteId = clienteEsistente.id;
    } else {
      const { data: newCliente, error: createErr } = await supabase
        .from('clienti')
        .insert({
          org_id: orgId,
          nome: nomeNormalizzato,
          cognome: cognomeNormalizzato,
          ragione_sociale: rapportino.cliente.ragioneSociale?.trim() || null,
          indirizzo: rapportino.cliente.indirizzo.trim(),
          citta: rapportino.cliente.citta.trim(),
          cap: rapportino.cliente.cap.trim(),
          telefono: telefonoNormalizzato,
          email: rapportino.cliente.email?.trim() || null,
          partita_iva: rapportino.cliente.partitaIva?.trim() || null,
          codice_fiscale: rapportino.cliente.codiceFiscale?.trim() || null,
        })
        .select('id')
        .single();

      if (createErr) throw createErr;
      clienteId = newCliente.id;
    }

    const { error } = await supabase
      .from('rapportini')
      .update({
        cliente_id: clienteId,
        data_intervento: rapportino.intervento.data,
        ora_intervento: rapportino.intervento.ora,
        tipo_stufa: rapportino.intervento.tipoStufa,
        marca: rapportino.intervento.marca,
        modello: rapportino.intervento.modello,
        numero_serie: rapportino.intervento.numeroSerie || null,
        tipo_intervento: rapportino.intervento.tipoIntervento,
        descrizione: rapportino.intervento.descrizione,
        materiali_utilizzati: rapportino.intervento.materialiUtilizzati || null,
        note: rapportino.intervento.note || null,
        firma_operatore: rapportino.intervento.firmaOperatore || null,
        firma_cliente: rapportino.intervento.firmaCliente || null,
      })
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating rapportino:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella modifica del rapportino' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un rapportino
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utente non fornito. Effettua il login.' },
        { status: 401 }
      );
    }

    // Se è un operatore (non admin), verifica che il rapportino appartenga all'utente
    if (userRole !== 'admin') {
      const { data: rapportino, error: fetchError } = await supabase
        .from('rapportini')
        .select('utente_id')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (fetchError || !rapportino) {
        return NextResponse.json(
          { error: 'Rapportino non trovato' },
          { status: 404 }
        );
      }

      if (rapportino.utente_id !== userId) {
        return NextResponse.json(
          { error: 'Non hai i permessi per eliminare questo rapportino' },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from('rapportini')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting rapportino:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nell\'eliminazione del rapportino' },
      { status: 500 }
    );
  }
}

