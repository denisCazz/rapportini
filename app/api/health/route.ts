import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isJwtSecretPlaceholder, validateJwtSecretConfig } from '@/lib/jwt-secret';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'error' | 'warning'> = {};
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    status = 'unhealthy';
  }

  try {
    validateJwtSecretConfig();
    checks.jwt = isJwtSecretPlaceholder() ? 'warning' : 'ok';
    if (checks.jwt === 'warning' && status === 'healthy') status = 'degraded';
  } catch {
    checks.jwt = 'error';
    status = 'unhealthy';
  }

  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  );
}
