import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// POST - Registrazione nuovo utente (solo operatore)
export async function POST(request: NextRequest) {
  try {
    const { username, password, nome, cognome, telefono, email, qualifica } = await request.json();

    // Validazione
    if (!username || !password || !nome || !cognome || !telefono || !qualifica) {
      return NextResponse.json(
        { error: 'Tutti i campi obbligatori devono essere compilati' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere di almeno 6 caratteri' },
        { status: 400 }
      );
    }

    // Verifica se l'username esiste già
    const { data: existingUser, error: checkError } = await supabase
      .from('utenti')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username già esistente' },
        { status: 409 }
      );
    }

    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10);

    // Crea nuovo utente (SOLO operatore, non admin)
    const { data: newUser, error: createError } = await supabase
      .from('utenti')
      .insert({
        username,
        password_hash: passwordHash,
        ruolo: 'operatore', // FORZATO a operatore, non può essere admin
        nome,
        cognome,
        telefono,
        email: email || null,
        qualifica,
        attivo: true,
      })
      .select('id, username, ruolo, nome, cognome, email')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    return NextResponse.json({
      success: true,
      message: 'Registrazione completata con successo',
      user: {
        id: newUser.id,
        username: newUser.username,
        ruolo: newUser.ruolo,
      },
    });
  } catch (error: any) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante la registrazione' },
      { status: 500 }
    );
  }
}

