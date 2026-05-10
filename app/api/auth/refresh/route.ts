import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createTokenPair } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { resolveAuthOrgId } from '@/lib/api-auth';
import { authAccessCookieOptions, authRefreshCookieOptions } from '@/lib/cookie-options';
import { getSuperUserJwtUserId, isSuperUserRefreshPayload, superUserDisplayProfile } from '@/lib/super-user';

// POST - Refresh token
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token mancante' }, { status: 401 });
    }

    const payload = await verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json({ error: 'Refresh token non valido' }, { status: 401 });
    }

    const orgId = payload.org_id || payload.idsocieta || (await resolveAuthOrgId(request));

    if (!orgId) {
      return NextResponse.json({ error: 'Organizzazione non configurata per il refresh token' }, { status: 401 });
    }

    if (isSuperUserRefreshPayload(payload)) {
      const profile = superUserDisplayProfile();
      const { accessToken, refreshToken: newRefreshToken } = await createTokenPair({
        id: getSuperUserJwtUserId(),
        username: (payload.username || process.env.SUPER_USER_USERNAME || '').trim(),
        ruolo: 'admin',
        org_id: orgId,
        must_change_password: false,
      });

      const response = NextResponse.json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: getSuperUserJwtUserId(),
          username: (process.env.SUPER_USER_USERNAME || '').trim(),
          org_id: orgId,
          ruolo: 'admin',
          nome: profile.nome,
          cognome: profile.cognome,
          telefono: '',
          email: '',
          qualifica: '',
          firma: '',
          must_change_password: false,
        },
      });

      response.cookies.set('access_token', accessToken, authAccessCookieOptions(15 * 60));
      response.cookies.set('refresh_token', newRefreshToken, authRefreshCookieOptions(7 * 24 * 60 * 60));
      return response;
    }

    const utente = await prisma.utenti.findFirst({
      where: { id: payload.userId, org_id: orgId },
      select: {
        id: true,
        username: true,
        ruolo: true,
        attivo: true,
        org_id: true,
        must_change_password: true,
      },
    });

    if (!utente || !utente.attivo) {
      const response = NextResponse.json({ error: 'Utente non trovato o disattivato' }, { status: 401 });
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    const ruolo = utente.ruolo === 'admin' ? 'admin' : 'operatore';

    const { accessToken, refreshToken: newRefreshToken } = await createTokenPair({
      id: utente.id,
      username: utente.username,
      ruolo,
      org_id: utente.org_id || orgId,
      must_change_password: Boolean(utente.must_change_password),
    });

    const response = NextResponse.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });

    response.cookies.set('access_token', accessToken, authAccessCookieOptions(15 * 60));
    response.cookies.set('refresh_token', newRefreshToken, authRefreshCookieOptions(7 * 24 * 60 * 60));

    return response;
  } catch (error: unknown) {
    console.error('Error during token refresh:', error);
    const message = error instanceof Error ? error.message : 'Errore durante il refresh del token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
