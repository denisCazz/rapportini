import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { resolveAuthOrgId } from '@/lib/api-auth';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP, createRateLimitKey } from '@/lib/rate-limit';
import { resolveCatOrgId } from '@/lib/cat-org';

const BCRYPT_ROUNDS = 12;

// POST - Registrazione nuovo utente (solo operatore)
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey('register', clientIP);
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.register);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: `Troppe richieste di registrazione. Riprova tra ${rateLimitResult.retryAfter} secondi.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      );
    }
    const payload = await request.json();

    let orgId = (
      payload?.org_id
      || payload?.idsocieta
      || ''
    ).toString().trim();

    const partitaIva = (payload?.partita_iva || '').toString().trim();
    const ragioneSociale = (payload?.ragione_sociale || '').toString().trim();

    if (partitaIva) {
      const catResolution = await resolveCatOrgId({
        partita_iva: partitaIva,
        ragione_sociale: ragioneSociale || undefined,
      });
      if ('error' in catResolution) {
        return NextResponse.json({ error: catResolution.error }, { status: 400 });
      }
      orgId = catResolution.orgId;
    }

    if (!orgId) {
      orgId = ((await resolveAuthOrgId(request)) || '').toString().trim();
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'Specifica la Partita IVA del CAT oppure configura DEFAULT_ORG_ID.' },
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
    const existingUser = await prisma.utenti.findFirst({
      where: { username, org_id: orgId },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username già esistente' },
        { status: 409 }
      );
    }

    // Hash della password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Crea nuovo utente (SOLO operatore, non admin)
    let newUser;
    try {
      newUser = await prisma.utenti.create({
        data: {
          username,
          password_hash: passwordHash,
          ruolo: 'operatore',
          org_id: orgId,
          nome,
          cognome,
          telefono,
          email: email || null,
          qualifica,
          attivo: true,
          must_change_password: false,
        },
        select: { id: true, username: true, ruolo: true, nome: true, cognome: true, email: true, org_id: true },
      });
    } catch (e: unknown) {
      console.error('Error creating user:', e);
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2003') {
        return NextResponse.json(
          { error: `Organizzazione non valida (org_id: ${orgId}). Verifica che esista nel database.` },
          { status: 400 }
        );
      }
      throw e;
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

