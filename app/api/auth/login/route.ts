import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// POST - Login utente
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username e password sono obbligatori' },
        { status: 400 }
      );
    }

    // Cerca utente nel database
    const { data: utente, error } = await supabase
      .from('utenti')
      .select('id, username, password_hash, ruolo, nome, cognome, telefono, email, qualifica, attivo')
      .eq('username', username)
      .single();

    if (error || !utente) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    if (!utente.attivo) {
      return NextResponse.json(
        { error: 'Account disattivato' },
        { status: 403 }
      );
    }

    // Verifica password
    // Gestisce sia hash bcrypt che password plaintext (per compatibilità con setup iniziale)
    let isValidPassword = false;
    
    if (!utente.password_hash) {
      console.error('Password hash mancante per utente:', username);
      return NextResponse.json(
        { error: 'Errore di configurazione account' },
        { status: 500 }
      );
    }

    // Prova prima con bcrypt (hash inizia con $2a$, $2b$, $2x$ o $2y$)
    if (utente.password_hash.match(/^\$2[abxy]\$/)) {
      try {
        // Hash bcrypt
        isValidPassword = await bcrypt.compare(password, utente.password_hash);
      } catch (bcryptError) {
        console.error('Errore nel confronto bcrypt:', bcryptError);
        isValidPassword = false;
      }
    } else {
      // Password plaintext (solo per setup iniziale - da cambiare in produzione)
      // ATTENZIONE: Questo è solo per compatibilità con setup iniziale
      isValidPassword = password === utente.password_hash;
      
      // Se la password è plaintext, suggerisci di hasharla
      if (isValidPassword) {
        console.warn(`ATTENZIONE: Password plaintext per utente ${username}. Dovresti hasharla con bcrypt.`);
      }
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Aggiorna ultimo accesso
    await supabase
      .from('utenti')
      .update({ ultimo_accesso: new Date().toISOString() })
      .eq('id', utente.id);

    // Restituisci dati utente (senza password)
    const userData = {
      id: utente.id,
      username: utente.username,
      ruolo: utente.ruolo,
      nome: utente.nome,
      cognome: utente.cognome,
      telefono: utente.telefono || '',
      email: utente.email || '',
      qualifica: utente.qualifica || '',
    };

    return NextResponse.json({ user: userData, success: true });
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il login' },
      { status: 500 }
    );
  }
}

