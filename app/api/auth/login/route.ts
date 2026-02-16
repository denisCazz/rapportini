import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { createTokenPair } from '@/lib/jwt';
import { loginSchema, validateRequest } from '@/lib/validation';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP, createRateLimitKey } from '@/lib/rate-limit';

// POST - Login utente
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey('login', clientIP);
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.login);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: `Troppi tentativi di login. Riprova tra ${rateLimitResult.retryAfter} secondi.`,
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          }
        }
      );
    }

    const body = await request.json();

    // Validazione input con Zod
    const validation = validateRequest(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // Cerca utente nel database - supporta sia username che email
    // Username e email sono case-insensitive (non distinguono maiuscole/minuscole)
    const isEmail = username.includes('@');
    
    let utente: any = null;
    let error = null;

    if (isEmail) {
      // Cerca per email (case-insensitive)
      const result = await supabase
        .from('utenti')
        .select('id, username, password_hash, ruolo, nome, cognome, telefono, email, qualifica, attivo, org_id')
        .ilike('email', username)
        .limit(20);
      const candidati = result.data || [];
      error = result.error;

      for (const candidato of candidati) {
        if (!candidato.attivo || !candidato.password_hash) {
          continue;
        }

        let ok = false;
        if (candidato.password_hash.match(/^\$2[abxy]\$/)) {
          ok = await bcrypt.compare(password, candidato.password_hash);
        } else {
          ok = password === candidato.password_hash;
        }

        if (ok) {
          utente = candidato;
          break;
        }
      }
    } else {
      // Cerca per username (case-insensitive)
      const result = await supabase
        .from('utenti')
        .select('id, username, password_hash, ruolo, nome, cognome, telefono, email, qualifica, attivo, org_id')
        .ilike('username', username)
        .limit(20);
      const candidati = result.data || [];
      error = result.error;

      for (const candidato of candidati) {
        if (!candidato.attivo || !candidato.password_hash) {
          continue;
        }

        let ok = false;
        if (candidato.password_hash.match(/^\$2[abxy]\$/)) {
          ok = await bcrypt.compare(password, candidato.password_hash);
        } else {
          ok = password === candidato.password_hash;
        }

        if (ok) {
          utente = candidato;
          break;
        }
      }
    }

    if (error) {
      console.error('Errore query utente:', error);
    }

    if (error || !utente) {
      console.log('Utente non trovato:', username);
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    console.log('Utente trovato:', utente.username, 'ruolo:', utente.ruolo, 'attivo:', utente.attivo);

    if (!utente.attivo) {
      return NextResponse.json(
        { error: 'Account disattivato' },
        { status: 403 }
      );
    }

    // Aggiorna ultimo accesso
    await supabase
      .from('utenti')
      .update({ ultimo_accesso: new Date().toISOString() })
      .eq('id', utente.id)
      .eq('org_id', utente.org_id || 'default');

    // Crea token JWT
    const { accessToken, refreshToken } = await createTokenPair({
      id: utente.id,
      username: utente.username,
      org_id: utente.org_id || 'default',
      ruolo: utente.ruolo,
    });

    // Dati utente (senza password)
    const userData = {
      id: utente.id,
      username: utente.username,
      org_id: utente.org_id || 'default',
      ruolo: utente.ruolo,
      nome: utente.nome,
      cognome: utente.cognome,
      telefono: utente.telefono || '',
      email: utente.email || '',
      qualifica: utente.qualifica || '',
    };

    // Crea response con cookie HttpOnly
    const response = NextResponse.json({ 
      user: userData, 
      success: true,
      // Includi anche i token per retrocompatibilità con localStorage
      accessToken,
      refreshToken,
    });

    // Imposta cookie HttpOnly per sicurezza
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minuti
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 giorni
      path: '/',
    });

    // Aggiungi header rate limit info
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime));

    return response;
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il login' },
      { status: 500 }
    );
  }
}

