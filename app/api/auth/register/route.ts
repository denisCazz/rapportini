import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { resolveAuthOrgId } from '@/lib/api-auth';

// POST - Registrazione nuovo utente (solo operatore)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const payload = await request.json();
    const orgId = (
      payload?.org_id
      || payload?.idsocieta
      || await resolveAuthOrgId(request, supabase)
      || ''
    ).toString().trim();

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organizzazione non configurata. Imposta DEFAULT_ORG_ID oppure invia header X-Org-Id.' },
        { status: 400 }
      );
    }
    const { username, password, nome, cognome, telefono, email, qualifica } = payload;

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

    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10);

    // Crea nuovo utente (SOLO operatore, non admin)
    const { data: newUser, error: createError } = await supabase
      .from('utenti')
      .insert({
        username,
        password_hash: passwordHash,
        ruolo: 'operatore', // FORZATO a operatore, non può essere admin
        org_id: orgId,
        nome,
        cognome,
        telefono,
        email: email || null,
        qualifica,
        attivo: true,
      })
      .select('id, username, ruolo, nome, cognome, email, org_id')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      if (createError.code === '23503' || String(createError.message || '').includes('utenti_org_id_fkey')) {
        return NextResponse.json(
          { error: `Organizzazione non valida (org_id: ${orgId}). Verifica che esista nel database.` },
          { status: 400 }
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

