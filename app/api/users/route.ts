import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { registerSchema, validateRequest } from '@/lib/validation';
import { getOrgIdFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET - Ottieni tutti gli utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userRole = request.headers.get('x-user-ruolo');
    const orgId = getOrgIdFromRequest(request);

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 403 }
      );
    }

    const { data: utenti, error } = await supabaseAdmin
      .from('utenti')
      .select('id, username, ruolo, nome, cognome, telefono, email, qualifica, attivo, ultimo_accesso, created_at')
      .eq('org_id', orgId)
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
    const supabaseAdmin = getSupabaseAdmin();
    const userRole = request.headers.get('x-user-ruolo');
    const orgId = getOrgIdFromRequest(request);

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
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    // Verifica username unico
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('utenti')
      .select('id')
      .eq('username', username)
      .eq('org_id', orgId)
      .maybeSingle();

    if (existingUserError && existingUserError.code !== 'PGRST116') {
      throw existingUserError;
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username già in uso' },
        { status: 400 }
      );
    }

    // Verifica email unica per organizzazione (se fornita)
    if (normalizedEmail) {
      const { data: existingEmailUser, error: existingEmailError } = await supabaseAdmin
        .from('utenti')
        .select('id')
        .eq('org_id', orgId)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingEmailError && existingEmailError.code !== 'PGRST116') {
        throw existingEmailError;
      }

      if (existingEmailUser) {
        return NextResponse.json(
          { error: 'Email già in uso in questa organizzazione' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Crea utente
    const { data: newUser, error } = await supabaseAdmin
      .from('utenti')
      .insert({
        username,
        password_hash: passwordHash,
        nome,
        cognome,
        email: normalizedEmail,
        telefono: telefono || null,
        qualifica: qualifica || null,
        ruolo,
        org_id: orgId,
        attivo: true,
      })
      .select('id, username, ruolo, nome, cognome, telefono, email, qualifica, attivo')
      .single();

    if (error) {
      if (error.code === '23505' && error.message?.includes('uq_utenti_org_email')) {
        return NextResponse.json(
          { error: 'Email già in uso in questa organizzazione' },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json({ data: newUser, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nella creazione dell\'utente' },
      { status: 500 }
    );
  }
}
