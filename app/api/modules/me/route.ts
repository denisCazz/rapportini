import { NextRequest, NextResponse } from 'next/server';
import { getActiveModuleCodesForUser } from '@/lib/module-access';
import { PAID_MODULES } from '@/lib/modules';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireAuthenticatedTenant(request);
    if (!tenant.ok) {
      return tenant.response;
    }

    const { id: userId, org_id: orgId } = tenant.user;
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
