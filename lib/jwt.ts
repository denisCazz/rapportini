import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'bitora-jwt-secret-key-change-this-in-production-2024'
);

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minuti
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 giorni

export interface TokenPayload extends JWTPayload {
  userId: string;
  username: string;
  ruolo: 'admin' | 'operatore';
  type: 'access' | 'refresh';
}

export async function createAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function createTokenPair(user: { id: string; username: string; ruolo: 'admin' | 'operatore' }) {
  const payload = {
    userId: user.id,
    username: user.username,
    ruolo: user.ruolo,
  };

  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(payload),
    createRefreshToken(payload),
  ]);

  return { accessToken, refreshToken };
}
