import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretBytes } from '@/lib/jwt-secret';
import { isOrgAdminRole } from '@/lib/roles';

// Percorsi pubblici che non richiedono autenticazione
const publicPaths = [
  '/login',
  '/register',
  '/register-cat',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register-cat',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/stripe/webhook',
  '/api/health',
  '/api/public/cat-invite',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/manifest.json',
  '/sw.js',
  '/icons',
];

import { requiresAdminAccess } from '@/lib/middleware-auth';

// Verifica token inline per il middleware (edge runtime)
async function verifyTokenInMiddleware(token: string): Promise<{ userId: string; username: string; ruolo: string; org_id?: string; idsocieta?: string; type: string; must_change_password?: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    return payload as { userId: string; username: string; ruolo: string; org_id?: string; idsocieta?: string; type: string; must_change_password?: boolean };
  } catch (e) {
    if (e instanceof Error && e.message.includes('JWT_SECRET')) {
      throw e;
    }
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permetti percorsi pubblici
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Ottieni il token dal cookie
  const cookieToken = request.cookies.get('access_token')?.value;
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = cookieToken || bearerToken;

  // Se non c'è token, reindirizza al login per le pagine o ritorna 401 per le API
  if (!accessToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifica il token
  let payload: Awaited<ReturnType<typeof verifyTokenInMiddleware>>;
  try {
    payload = await verifyTokenInMiddleware(accessToken);
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Configurazione server incompleta' }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!payload || payload.type !== 'access') {
    // Token non valido o scaduto
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }
    // Cancella i cookie e reindirizza al login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  // Obbligo cambio password: solo logout, refresh, cambio password API, pagina dedicata
  if (payload.must_change_password === true) {
    const allowedWhenMustChange =
      pathname === '/change-password-required' ||
      pathname.startsWith('/api/auth/logout') ||
      pathname.startsWith('/api/auth/refresh') ||
      /^\/api\/users\/[0-9a-f-]{36}\/password$/i.test(pathname);

    if (!allowedWhenMustChange) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'È necessario cambiare la password prima di continuare.' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/change-password-required', request.url));
    }
  }

  // Verifica permessi admin per percorsi protetti
  if (requiresAdminAccess(pathname)) {
    if (!isOrgAdminRole(payload.ruolo)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Accesso non autorizzato' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Aggiungi i dati utente agli header per le API
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-ruolo', payload.ruolo);
  requestHeaders.set('x-user-username', payload.username);
  const orgId = payload.org_id || payload.idsocieta || 'default';
  requestHeaders.set('x-org-id', orgId);
  requestHeaders.set('x-tenant-id', orgId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
