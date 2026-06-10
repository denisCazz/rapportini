import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { setModuleActiveForUser } from '@/lib/module-access';
import { MODULE_CODES, PAID_MODULES, ModuleCode } from '@/lib/modules';
import { validateRequest } from '@/lib/validation';

const updateModuleSchema = z.object({
  utente_id: z.string().uuid(),
  module_code: z.enum([
    MODULE_CODES.PIANIFICAZIONE_INTERVENTI,
    MODULE_CODES.ASSEGNAZIONE_LAVORI,
    MODULE_CODES.NOTIFICHE_SCADENZE,
  ]),
  attivo: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    const orgId = getOrgIdFromRequest(request);

    const [moduli, operatori, attivazioni] = await Promise.all([
      prisma.moduli.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, code: true, nome: true, descrizione: true },
      }),
      prisma.utenti.findMany({
        where: { org_id: orgId, ruolo: 'operatore' },
        orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
        select: {
          id: true,
          nome: true,
          cognome: true,
          username: true,
          attivo: true,
        },
      }),
      prisma.utenteModuli.findMany({
        where: { org_id: orgId },
        select: {
          utente_id: true,
          attivo: true,
          moduli: { select: { code: true } },
        },
      }),
    ]);

    const activationMap = new Map<string, boolean>();
    for (const row of attivazioni) {
      activationMap.set(`${row.utente_id}:${row.moduli.code}`, row.attivo);
    }

    const catalog = moduli.length > 0
      ? moduli
      : PAID_MODULES.map((m) => ({
          id: m.code,
          code: m.code,
          nome: m.nome,
          descrizione: m.descrizione,
        }));

    const tecnici = operatori.map((operatore) => ({
      ...operatore,
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
    const userRole = request.headers.get('x-user-ruolo');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(updateModuleSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { utente_id, module_code, attivo } = validation.data;
    const orgId = getOrgIdFromRequest(request);

    const operatore = await prisma.utenti.findFirst({
      where: { id: utente_id, org_id: orgId, ruolo: 'operatore' },
      select: { id: true },
    });

    if (!operatore) {
      return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 });
    }

    await setModuleActiveForUser(
      utente_id,
      orgId,
      module_code as ModuleCode,
      attivo
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/modules error:', error);
    return NextResponse.json({ error: 'Errore nell\'aggiornamento del modulo' }, { status: 500 });
  }
}
