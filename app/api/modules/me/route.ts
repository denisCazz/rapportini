import { NextRequest, NextResponse } from 'next/server';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { getActiveModuleCodesForUser } from '@/lib/module-access';
import { PAID_MODULES } from '@/lib/modules';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const orgId = getOrgIdFromRequest(request);
    const activeCodes = await getActiveModuleCodesForUser(userId, orgId);

    const modules = PAID_MODULES.map((modulo) => ({
      code: modulo.code,
      nome: modulo.nome,
      descrizione: modulo.descrizione,
      href: modulo.href,
      attivo: activeCodes.includes(modulo.code),
    }));

    return NextResponse.json({ data: modules });
  } catch (error) {
    console.error('GET /api/modules/me error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento dei moduli' }, { status: 500 });
  }
}
