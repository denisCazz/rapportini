import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { getJwtSecretBytes } from '@/lib/jwt-secret';
import { UserRole } from '@/lib/roles';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minuti
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 giorni

export interface TokenPayload extends JWTPayload {
  userId: string;
  username: string;
  org_id: string;
  idsocieta?: string;
  ruolo: UserRole;
  type: 'access' | 'refresh';
  /** True = obbligo cambio password prima di usare l'app */
  must_change_password?: boolean;
}

export async function createAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getJwtSecretBytes());
}

export async function createRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getJwtSecretBytes());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function createTokenPair(user: {
  id: string;
  username: string;
  ruolo: UserRole;
  org_id?: string;
  idsocieta?: string;
  must_change_password?: boolean;
}) {
  const payload = {
    userId: user.id,
    username: user.username,
    org_id: user.org_id || user.idsocieta || 'default',
    ruolo: user.ruolo,
    must_change_password: user.must_change_password === true,
  };

  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(payload),
    createRefreshToken(payload),
  ]);

  return { accessToken, refreshToken };
}
