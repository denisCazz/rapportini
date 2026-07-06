import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { mapPlannerClienteListItem } from '@/lib/planner-clienti';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PLANNER);
    if (!auth.ok) return auth.response;

    const { org_id: orgId } = auth.user;
    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 100);

    const clienti = await prisma.clienti.findMany({
      where: {
        org_id: orgId,
        ...(q
          ? {
              OR: [
                { nome: { contains: q, mode: 'insensitive' as const } },
                { cognome: { contains: q, mode: 'insensitive' as const } },
                { citta: { contains: q, mode: 'insensitive' as const } },
                { telefono: { contains: q } },
                { email: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        citta: true,
        telefono: true,
        email: true,
        indirizzo: true,
        lat: true,
        lng: true,
        _count: {
          select: {
            rapportini: true,
            contatti: true,
            note_crm: true,
          },
        },
      },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      take: limit,
    });

    return NextResponse.json({
      data: clienti.map(mapPlannerClienteListItem),
    });
  } catch (error: unknown) {
    console.error('Error fetching planner clienti:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero contatti';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
