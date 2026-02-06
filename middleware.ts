import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Percorsi pubblici che non richiedono autenticazione
const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/manifest.json',
  '/sw.js',
  '/icons',
];

// Percorsi che richiedono ruolo admin
const adminPaths = [
  '/admin',
  '/api/admin',
  '/api/users',
];

// Verifica token inline per il middleware (edge runtime)
async function verifyTokenInMiddleware(token: string): Promise<{ userId: string; username: string; ruolo: string; type: string } | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'bitora-jwt-secret-key-change-this-in-production-2024'
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; username: string; ruolo: string; type: string };
  } catch {
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
  const accessToken = request.cookies.get('access_token')?.value;

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
  const payload = await verifyTokenInMiddleware(accessToken);

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

  // Verifica permessi admin per percorsi protetti
  if (adminPaths.some(path => pathname.startsWith(path))) {
    if (payload.ruolo !== 'admin') {
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
