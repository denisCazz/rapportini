import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { registerSchema, validateRequest } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// GET - Ottieni tutti gli utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 403 }
      );
    }

    const { data: utenti, error } = await supabase
      .from('utenti')
      .select('id, username, ruolo, nome, cognome, telefono, email, qualifica, attivo, ultimo_accesso, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: utenti });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero degli utenti' },
      { status: 500 }
    );
  }
}

// POST - Crea nuovo utente (solo admin)
export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validazione
    const validation = validateRequest(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { username, password, nome, cognome, email, telefono, qualifica, ruolo } = validation.data;

    // Verifica username unico
    const { data: existingUser } = await supabase
      .from('utenti')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username già in uso' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Crea utente
    const { data: newUser, error } = await supabase
      .from('utenti')
      .insert({
        username,
        password_hash: passwordHash,
        nome,
        cognome,
        email: email || null,
        telefono: telefono || null,
        qualifica: qualifica || null,
        ruolo,
        attivo: true,
      })
      .select('id, username, ruolo, nome, cognome, telefono, email, qualifica, attivo')
      .single();

    if (error) throw error;

    return NextResponse.json({ data: newUser, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nella creazione dell\'utente' },
      { status: 500 }
    );
  }
}
