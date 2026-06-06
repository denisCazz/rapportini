import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createTokenPair } from '@/lib/jwt';
import { loginSchema, validateRequest } from '@/lib/validation';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP, createRateLimitKey } from '@/lib/rate-limit';
import { resolveAuthOrgId } from '@/lib/api-auth';
import { authAccessCookieOptions, authRefreshCookieOptions } from '@/lib/cookie-options';
import { writeAuditLog } from '@/lib/audit-log';

const userLoginSelect = {
  id: true,
  username: true,
  password_hash: true,
  ruolo: true,
  nome: true,
  cognome: true,
  telefono: true,
  email: true,
  qualifica: true,
  firma: true,
  attivo: true,
  org_id: true,
  must_change_password: true,
} as const;

// POST - Login utente
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey('login', clientIP);
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.login);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: `Troppi tentativi di login. Riprova tra ${rateLimitResult.retryAfter} secondi.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          },
        }
      );
    }

    const body = await request.json();

    const validation = validateRequest(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { username, password } = validation.data;
    const requestedOrgId = (
      body?.org_id ||
      body?.idsocieta ||
      (await resolveAuthOrgId(request)) ||
      ''
    )
      .toString()
      .trim();

    if (!requestedOrgId) {
      return NextResponse.json(
        { error: 'Organizzazione non configurata. Imposta DEFAULT_ORG_ID o invia org_id.' },
        { status: 400 }
      );
    }

    const isEmail = username.includes('@');
    const trimmed = username.trim();

    const candidati = await prisma.utenti.findMany({
      where: {
        org_id: requestedOrgId,
        attivo: true,
        ...(isEmail
          ? { email: { equals: trimmed, mode: 'insensitive' as const } }
          : { username: { equals: trimmed, mode: 'insensitive' as const } }),
      },
      take: 20,
      select: userLoginSelect,
    });

    let utente: (typeof candidati)[0] | null = null;

    for (const candidato of candidati) {
      if (!candidato.password_hash?.match(/^\$2[abxy]\$/)) {
        continue;
      }
      const ok = await bcrypt.compare(password, candidato.password_hash);
      if (ok) {
        utente = candidato;
        break;
      }
    }

    if (!utente) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    if (!utente.attivo) {
      return NextResponse.json({ error: 'Account disattivato' }, { status: 403 });
    }

    const resolvedOrgId = utente.org_id || requestedOrgId;
    if (!resolvedOrgId) {
      return NextResponse.json(
        { error: 'Organizzazione utente non valida o non configurata' },
        { status: 400 }
      );
    }

    await prisma.utenti.updateMany({
      where: { id: utente.id, org_id: resolvedOrgId },
      data: { ultimo_accesso: new Date() },
    });

    const mustChange = Boolean(utente.must_change_password);
    const ruolo = utente.ruolo === 'admin' ? 'admin' : 'operatore';

    const { accessToken, refreshToken } = await createTokenPair({
      id: utente.id,
      username: utente.username,
      org_id: resolvedOrgId,
      ruolo,
      must_change_password: mustChange,
    });

    const userData = {
      id: utente.id,
      username: utente.username,
      org_id: resolvedOrgId,
      ruolo,
      nome: utente.nome,
      cognome: utente.cognome,
      telefono: utente.telefono || '',
      email: utente.email || '',
      qualifica: utente.qualifica || '',
      firma: utente.firma || '',
      must_change_password: mustChange,
    };

    const response = NextResponse.json({
      user: userData,
      success: true,
      accessToken,
      refreshToken,
    });

    response.cookies.set('access_token', accessToken, authAccessCookieOptions(15 * 60));
    response.cookies.set('refresh_token', refreshToken, authRefreshCookieOptions(7 * 24 * 60 * 60));

    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime));

    void writeAuditLog({
      org_id: resolvedOrgId,
      user_id: utente.id,
      action: 'login_success',
      resource: 'session',
      ip: clientIP,
    });

    return response;
  } catch (error: unknown) {
    console.error('Error during login:', error);
    const message = error instanceof Error ? error.message : 'Errore durante il login';
    if (message.includes('JWT_SECRET')) {
      return NextResponse.json({ error: 'Configurazione server incompleta' }, { status: 503 });
    }
    const isDbError =
      message.includes("Can't reach database") ||
      message.includes('P1001') ||
      message.includes('ECONNREFUSED') ||
      message.includes('connection');
    if (isDbError) {
      return NextResponse.json(
        {
          error:
            'Database non raggiungibile. Verifica POSTGRES_* in .env e che il server sia attivo.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Errore durante il login' },
      { status: 500 }
    );
  }
}
