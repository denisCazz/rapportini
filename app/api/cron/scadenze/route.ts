import { NextRequest, NextResponse } from 'next/server';
import { runScadenzeEmailReminders } from '@/lib/scadenze-cron';

export const runtime = 'nodejs';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const result = await runScadenzeEmailReminders();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('GET /api/cron/scadenze error:', error);
    return NextResponse.json({ error: 'Errore cron scadenze' }, { status: 500 });
  }
}
