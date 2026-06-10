import { NextRequest, NextResponse } from 'next/server';
import { isModuleActiveForUser } from '@/lib/module-access';
import { ModuleCode } from '@/lib/modules';
import { requireAuthenticatedTenant } from '@/lib/tenant-context';

export interface ModuleAuthUser {
  id: string;
  ruolo: string;
  org_id: string;
}

export type ModuleAuthResult =
  | { ok: true; user: ModuleAuthUser }
  | { ok: false; response: NextResponse };

export async function requireModuleAccess(
  request: NextRequest,
  moduleCode: ModuleCode
): Promise<ModuleAuthResult> {
  const tenant = await requireAuthenticatedTenant(request);
  if (!tenant.ok) {
    return { ok: false, response: tenant.response };
  }

  const user = tenant.user;

  if (user.ruolo === 'admin') {
    return { ok: true, user };
  }

  const active = await isModuleActiveForUser(user.id, user.org_id, moduleCode);
  if (!active) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Modulo non attivo per il tuo account' }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
