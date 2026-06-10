import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { registerCatSchema, validateRequest } from '@/lib/validation';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP, createRateLimitKey } from '@/lib/rate-limit';
import {
  buildCatOrgId,
  isValidPartitaIva,
  normalizePartitaIva,
} from '@/lib/cat-org';

const BCRYPT_ROUNDS = 12;

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
    const validation = validateRequest(registerCatSchema, payload);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const {
      ragione_sociale,
      partita_iva,
      username,
      password,
      nome,
      cognome,
      telefono,
      email,
    } = validation.data;

    if (!isValidPartitaIva(partita_iva)) {
      return NextResponse.json({ error: 'Partita IVA non valida (11 cifre)' }, { status: 400 });
    }

    const normalizedPiva = normalizePartitaIva(partita_iva);
    const orgId = buildCatOrgId(normalizedPiva);

    const existingOrg = await prisma.organizzazioni.findFirst({
      where: {
        OR: [{ org_id: orgId }, { partita_iva: normalizedPiva }],
      },
      select: { org_id: true },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Esiste già un CAT registrato con questa Partita IVA' },
        { status: 409 }
      );
    }

    const existingUser = await prisma.utenti.findFirst({
      where: { username, org_id: orgId },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username già esistente' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await prisma.$transaction(async (tx) => {
      await tx.organizzazioni.create({
        data: {
          org_id: orgId,
          nome_azienda: ragione_sociale.trim(),
          partita_iva: normalizedPiva,
          tipo: 'cat',
        },
      });

      return tx.utenti.create({
        data: {
          username,
          password_hash: passwordHash,
          ruolo: 'admin_cat',
          org_id: orgId,
          nome,
          cognome,
          telefono,
          email: email || null,
          qualifica: 'Amministratore CAT',
          attivo: true,
          must_change_password: false,
        },
        select: {
          id: true,
          username: true,
          ruolo: true,
          nome: true,
          cognome: true,
          email: true,
          org_id: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Registrazione CAT completata con successo',
      user: {
        id: newUser.id,
        username: newUser.username,
        org_id: newUser.org_id,
        ruolo: newUser.ruolo,
      },
      cat: {
        org_id: orgId,
        ragione_sociale: ragione_sociale.trim(),
        partita_iva: normalizedPiva,
      },
    });
  } catch (error: unknown) {
    console.error('Error during CAT registration:', error);
    const message = error instanceof Error ? error.message : 'Errore durante la registrazione CAT';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
