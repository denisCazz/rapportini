import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

const adminPaths = [
  '/admin',
  '/api/admin',
  '/api/users',
];

async function verifyTokenInProxy(token: string): Promise<{ userId: string; username: string; ruolo: string; org_id?: string; idsocieta?: string; type: string } | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET?.trim();
    if (!jwtSecret || jwtSecret.length < 32) {
      return null;
    }
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; username: string; ruolo: string; org_id?: string; idsocieta?: string; type: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get('access_token')?.value;
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const accessToken = cookieToken || bearerToken;

  if (!accessToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyTokenInProxy(accessToken);

  if (!payload || payload.type !== 'access') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
