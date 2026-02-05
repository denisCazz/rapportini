import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Rapportino } from '@/types';
import { getUserIdFromRequest } from '@/lib/api-auth';
import { rapportiniFilterSchema, rapportinoSchema, validateRequest, validateQueryParams } from '@/lib/validation';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP, createRateLimitKey } from '@/lib/rate-limit';

// Cache configuration per Next.js 16.1
export const dynamic = 'force-dynamic'; // Disabilita caching per dati dinamici
export const revalidate = 0; // Non cacheare

// GET - Ottieni tutti i rapportini (filtrati per utente se operatore)
export async function GET(request: NextRequest) {
  try {
    // Ottieni ID utente dalla richiesta
    const userId = getUserIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    // Valida e ottieni i parametri di filtro
    const validation = validateQueryParams(rapportiniFilterSchema, request.nextUrl.searchParams);
    const filters = validation.success ? validation.data : { page: 1, limit: 20 };

    // Costruisci la query base con conteggio
    let countQuery = supabase
      .from('rapportini')
      .select('*', { count: 'exact', head: true });

    let query = supabase
      .from('rapportini')
      .select(`
        *,
        utente:utenti(id, nome, cognome, telefono, email, qualifica),
        cliente:clienti(*)
      `)
      .order('data_intervento', { ascending: false });

    // Se è un operatore (non admin), mostra solo i suoi rapportini
    if (userRole !== 'admin' && userId) {
      query = query.eq('utente_id', userId);
      countQuery = countQuery.eq('utente_id', userId);
    }

    // Applica filtri
    if (filters.tipoStufa) {
      query = query.eq('tipo_stufa', filters.tipoStufa);
      countQuery = countQuery.eq('tipo_stufa', filters.tipoStufa);
    }

    if (filters.dataInizio) {
      query = query.gte('data_intervento', filters.dataInizio);
      countQuery = countQuery.gte('data_intervento', filters.dataInizio);
    }

    if (filters.dataFine) {
      query = query.lte('data_intervento', filters.dataFine);
      countQuery = countQuery.lte('data_intervento', filters.dataFine);
    }

    if (filters.marca) {
      query = query.ilike('marca', `%${filters.marca}%`);
      countQuery = countQuery.ilike('marca', `%${filters.marca}%`);
    }

    if (filters.modello) {
      query = query.ilike('modello', `%${filters.modello}%`);
      countQuery = countQuery.ilike('modello', `%${filters.modello}%`);
    }

    if (filters.clienteId) {
      query = query.eq('cliente_id', filters.clienteId);
      countQuery = countQuery.eq('cliente_id', filters.clienteId);
    }

    // Paginazione
    const offset = (filters.page - 1) * filters.limit;
    query = query.range(offset, offset + filters.limit - 1);

    // Esegui query
    const [{ data: rapportini, error }, { count }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;

    // Trasforma i dati dal formato DB al formato dell'app
    const formattedRapportini: Rapportino[] = (rapportini || []).map((r: any) => ({
      id: r.id,
      operatore: {
        nome: r.utente?.nome || '',
        cognome: r.utente?.cognome || '',
        telefono: r.utente?.telefono || '',
        email: r.utente?.email || '',
        qualifica: r.utente?.qualifica || '',
      },
      cliente: {
        nome: r.cliente.nome,
        cognome: r.cliente.cognome,
        ragioneSociale: r.cliente.ragione_sociale || '',
        indirizzo: r.cliente.indirizzo,
        citta: r.cliente.citta,
        cap: r.cliente.cap,
        telefono: r.cliente.telefono,
        email: r.cliente.email || '',
        partitaIva: r.cliente.partita_iva || '',
        codiceFiscale: r.cliente.codice_fiscale || '',
      },
      intervento: {
        data: r.data_intervento,
        ora: r.ora_intervento,
        tipoStufa: r.tipo_stufa as 'pellet' | 'legno',
        marca: r.marca,
        modello: r.modello,
        numeroSerie: r.numero_serie || '',
        tipoIntervento: r.tipo_intervento,
        descrizione: r.descrizione,
        materialiUtilizzati: r.materiali_utilizzati || '',
        note: r.note || '',
        firmaCliente: r.firma_cliente || '',
      },
      dataCreazione: r.data_creazione || r.created_at,
    }));

    const totalPages = Math.ceil((count || 0) / filters.limit);

    const response = NextResponse.json({
      data: formattedRapportini,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1,
      },
    });
    
    // Aggiungi cache headers per ottimizzare le richieste
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Error fetching rapportini:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero dei rapportini' },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo rapportino
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey('createRapportino', clientIP);
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.createRapportino);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: `Troppe richieste. Riprova tra ${rateLimitResult.retryAfter} secondi.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rapportinoData = body.rapportino || body;
    const userId = body.userId || getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utente non fornito. Effettua il login.' },
        { status: 401 }
      );
    }

    // Validazione input con Zod
    const validation = validateRequest(rapportinoSchema, rapportinoData);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const rapportino = validation.data;

    // Verifica che l'utente esista
    const { data: utente, error: utenteError } = await supabase
      .from('utenti')
      .select('id, ruolo')
      .eq('id', userId)
      .single();

    if (utenteError || !utente) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Solo operatori possono creare rapportini (admin può vedere tutto ma non creare)
    if (utente.ruolo !== 'operatore') {
      return NextResponse.json(
        { error: 'Solo gli operatori possono creare rapportini' },
        { status: 403 }
      );
    }

    // Cerca o crea cliente
    const nomeNormalizzato = rapportino.cliente.nome.trim();
    const cognomeNormalizzato = rapportino.cliente.cognome.trim();
    const telefonoNormalizzato = rapportino.cliente.telefono.trim();

    let clienteId: string | null = null;

    // Prima cerca per nome + cognome + telefono (match esatto)
    let { data: clienteData } = await supabase
      .from('clienti')
      .select('id')
      .eq('nome', nomeNormalizzato)
      .eq('cognome', cognomeNormalizzato)
      .eq('telefono', telefonoNormalizzato)
      .maybeSingle();

    if (clienteData) {
      clienteId = clienteData.id;
    } else {
      // Se non trovato, cerca solo per nome + cognome
      const { data: clienteNomeCognome } = await supabase
        .from('clienti')
        .select('id')
        .eq('nome', nomeNormalizzato)
        .eq('cognome', cognomeNormalizzato)
        .limit(1)
        .maybeSingle();

      if (clienteNomeCognome) {
        clienteId = clienteNomeCognome.id;
      }
    }

    // Se non trovato, crea nuovo cliente
    if (!clienteId) {
      const { data: newCliente, error: createClienteError } = await supabase
        .from('clienti')
        .insert({
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

      if (createClienteError) {
        if (createClienteError.code === '23505') {
          const { data: existingCliente } = await supabase
            .from('clienti')
            .select('id')
            .eq('nome', nomeNormalizzato)
            .eq('cognome', cognomeNormalizzato)
            .eq('telefono', telefonoNormalizzato)
            .maybeSingle();
          
          if (existingCliente) {
            clienteId = existingCliente.id;
          } else {
            throw createClienteError;
          }
        } else {
          throw createClienteError;
        }
      } else {
        clienteId = newCliente.id;
      }
    }

    // Crea rapportino usando l'ID utente
    const { data: newRapportino, error: rapportinoError } = await supabase
      .from('rapportini')
      .insert({
        utente_id: userId,
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
        firma_cliente: rapportino.intervento.firmaCliente || null,
        data_creazione: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (rapportinoError) throw rapportinoError;

    return NextResponse.json({ id: newRapportino.id, success: true });
  } catch (error: any) {
    console.error('Error creating rapportino:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nella creazione del rapportino' },
      { status: 500 }
    );
  }
}

