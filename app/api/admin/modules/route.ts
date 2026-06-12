import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { canManageModulesAdmin } from '@/lib/module-admin';
import { setModuleActiveForUser } from '@/lib/module-access';
import { ALL_MODULE_CODES, PAID_MODULES, ModuleCode } from '@/lib/modules';
import { getCatOrgLabels, getPlatformAdminVisibleOrgIds } from '@/lib/user-scope';
import { validateRequest } from '@/lib/validation';

const updateModuleSchema = z.object({
  utente_id: z.string().uuid(),
  module_code: z.enum(ALL_MODULE_CODES as [ModuleCode, ...ModuleCode[]]),
  attivo: z.boolean(),
});

async function assertModulesSuperAdmin(request: NextRequest): Promise<NextResponse | null> {
  const userRole = request.headers.get('x-user-ruolo');
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
  }

  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const adminUser = await prisma.utenti.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!canManageModulesAdmin(adminUser?.email)) {
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const denied = await assertModulesSuperAdmin(request);
    if (denied) return denied;

    const orgId = getOrgIdFromRequest(request);
    const visibleOrgIds = await getPlatformAdminVisibleOrgIds(orgId);

    const [moduli, operatori, attivazioni, orgLabels] = await Promise.all([
      prisma.moduli.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, code: true, nome: true, descrizione: true },
      }),
      prisma.utenti.findMany({
        where: { org_id: { in: visibleOrgIds }, ruolo: { in: ['operatore', 'admin_cat'] } },
        orderBy: [{ org_id: 'asc' }, { cognome: 'asc' }, { nome: 'asc' }],
        select: {
          id: true,
          org_id: true,
          ruolo: true,
          nome: true,
          cognome: true,
          username: true,
          attivo: true,
        },
      }),
      prisma.utenteModuli.findMany({
        where: { org_id: { in: visibleOrgIds } },
        select: {
          utente_id: true,
          attivo: true,
          stripe_subscription_status: true,
          moduli: { select: { code: true } },
        },
      }),
      getCatOrgLabels(visibleOrgIds),
    ]);

    const activationMap = new Map<string, boolean>();
    for (const row of attivazioni) {
      const active =
        row.attivo ||
        row.stripe_subscription_status === 'active' ||
        row.stripe_subscription_status === 'trialing';
      activationMap.set(`${row.utente_id}:${row.moduli.code}`, active);
    }

    const catalog = moduli.length > 0
      ? moduli
      : PAID_MODULES.map((m) => ({
          id: m.code,
          code: m.code,
          nome: m.nome,
          descrizione: m.descrizione,
        }));

    const tecnici = operatori.map(({ org_id: userOrgId, ...operatore }) => ({
      ...operatore,
      organizzazione:
        userOrgId === orgId ? 'Sede principale' : orgLabels.get(userOrgId) ?? userOrgId,
      moduli: catalog.map((modulo) => ({
        code: modulo.code,
        nome: modulo.nome,
        attivo: activationMap.get(`${operatore.id}:${modulo.code}`) ?? false,
      })),
    }));

    return NextResponse.json({
      data: {
        moduli: catalog,
        tecnici,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/modules error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento dei moduli' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = await assertModulesSuperAdmin(request);
    if (denied) return denied;

    const body = await request.json();
    const validation = validateRequest(updateModuleSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { utente_id, module_code, attivo } = validation.data;
    const orgId = getOrgIdFromRequest(request);
    const visibleOrgIds = await getPlatformAdminVisibleOrgIds(orgId);

    const operatore = await prisma.utenti.findFirst({
      where: {
        id: utente_id,
        org_id: { in: visibleOrgIds },
        ruolo: { in: ['operatore', 'admin_cat'] },
      },
      select: { id: true, org_id: true },
    });

    if (!operatore) {
      return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 });
    }

    await setModuleActiveForUser(
      utente_id,
      operatore.org_id,
      module_code as ModuleCode,
      attivo
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/modules error:', error);
    return NextResponse.json({ error: 'Errore nell\'aggiornamento del modulo' }, { status: 500 });
  }
}
