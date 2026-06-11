import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { isOrgAdminRole } from '@/lib/roles';
import { getSafeErrorMessage } from '@/lib/api-error';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildBaseWhere(orgId: string, userRole: string, userId: string | null): Prisma.RapportiniWhereInput {
  const where: Prisma.RapportiniWhereInput = { org_id: orgId };
  if (!isOrgAdminRole(userRole) && userId) {
    where.utente_id = userId;
  }
  return where;
}

// GET - Conteggi aggregati per KPI dashboard (senza caricare l'elenco completo)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';
    const where = buildBaseWhere(orgId, userRole, userId);

    const [total, byTipoStufa] = await Promise.all([
      prisma.rapportini.count({ where }),
      prisma.rapportini.groupBy({
        by: ['tipo_stufa'],
        where,
        _count: { _all: true },
      }),
    ]);

    let pellet = 0;
    let legno = 0;
    for (const row of byTipoStufa) {
      if (row.tipo_stufa === 'pellet') pellet = row._count._all;
      else if (row.tipo_stufa === 'legno') legno = row._count._all;
    }

    const response = NextResponse.json({
      total,
      pellet,
      legno,
    });
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching rapportini summary:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Errore nel recupero del riepilogo') },
      { status: 500 }
    );
  }
}
