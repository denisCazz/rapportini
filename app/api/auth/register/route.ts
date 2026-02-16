import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { getOrgIdFromRequest } from '@/lib/api-auth';

async function resolveRegistrationOrgId(preferredOrgId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();

  // Se arriva un org_id esplicito (es. da header middleware), usalo.
  if (preferredOrgId && preferredOrgId !== 'default') {
    return preferredOrgId;
  }

  // Fallback: usa l'org_id di un utente esistente (tipico setup single-tenant).
  const { data: existingUser } = await supabaseAdmin
    .from('utenti')
    .select('org_id')
    .limit(1)
    .maybeSingle();

  if (existingUser?.org_id) {
    return existingUser.org_id;
  }

  // Ultimo fallback: mantiene comportamento precedente.
  return preferredOrgId || 'default';
}

// POST - Registrazione nuovo utente (solo operatore)
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const requestedOrgId = getOrgIdFromRequest(request);
    const { username, password, nome, cognome, telefono, email, qualifica, org_id } = await request.json();
    const orgId = await resolveRegistrationOrgId((org_id as string) || requestedOrgId);
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

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
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('utenti')
      .select('id')
      .eq('username', username)
      .eq('org_id', orgId)
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

    // Verifica email unica per organizzazione (se fornita)
    if (normalizedEmail) {
      const { data: existingEmailUser, error: emailCheckError } = await supabaseAdmin
        .from('utenti')
        .select('id')
        .eq('org_id', orgId)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        throw emailCheckError;
      }

      if (existingEmailUser) {
        return NextResponse.json(
          { error: 'Email già in uso in questa organizzazione' },
          { status: 409 }
        );
      }
    }

    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10);

    // Crea nuovo utente (SOLO operatore, non admin)
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('utenti')
      .insert({
        username,
        password_hash: passwordHash,
        ruolo: 'operatore', // FORZATO a operatore, non può essere admin
        org_id: orgId,
        nome,
        cognome,
        telefono,
        email: normalizedEmail,
        qualifica,
        attivo: true,
      })
      .select('id, username, ruolo, nome, cognome, email, org_id')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);

      if (createError.code === '23503') {
        return NextResponse.json(
          {
            error: 'Organizzazione non valida (org_id). Configura un org_id esistente oppure imposta il tenant corretto in fase di registrazione.',
          },
          { status: 400 }
        );
      }

      if (createError.code === '23505' && createError.message?.includes('uq_utenti_org_email')) {
        return NextResponse.json(
          { error: 'Email già in uso in questa organizzazione' },
          { status: 409 }
        );
      }

      throw createError;
    }

    return NextResponse.json({
      success: true,
      message: 'Registrazione completata con successo',
      user: {
        id: newUser.id,
        username: newUser.username,
        org_id: newUser.org_id,
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

