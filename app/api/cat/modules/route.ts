import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { setModuleActiveForUser } from '@/lib/module-access';
import {
  calcCatLicensePriceEur,
  CAT_BASE_OPERATOR_SLOTS,
  CAT_EXTRA_OPERATOR_PRICE_EUR,
  CAT_BASE_PRICE_EUR,
} from '@/lib/cat-pricing';
import { isCatBundleSubscriptionActive } from '@/lib/cat-subscription';
import { MODULE_CODES, PAID_MODULES, ModuleCode } from '@/lib/modules';
import { isCatAdmin } from '@/lib/roles';
import { validateRequest } from '@/lib/validation';
import { isStripeConfigured } from '@/lib/stripe';

const updateModuleSchema = z.object({
  utente_id: z.string().uuid(),
  module_code: z.enum([
    MODULE_CODES.PIANIFICAZIONE_INTERVENTI,
    MODULE_CODES.ASSEGNAZIONE_LAVORI,
    MODULE_CODES.NOTIFICHE_SCADENZE,
  ]),
  attivo: z.boolean(),
});

function assertCatAdmin(request: NextRequest): NextResponse | null {
  const userRole = request.headers.get('x-user-ruolo');
  if (!isCatAdmin(userRole)) {
    return NextResponse.json({ error: 'Accesso riservato agli amministratori CAT' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const denied = assertCatAdmin(request);
    if (denied) return denied;

    const orgId = getOrgIdFromRequest(request);

    const [moduli, operatori, attivazioni, org] = await Promise.all([
      prisma.moduli.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, code: true, nome: true, descrizione: true },
      }),
      prisma.utenti.findMany({
        where: { org_id: orgId, ruolo: 'operatore', attivo: true },
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
      prisma.organizzazioni.findUnique({
        where: { org_id: orgId },
        select: {
          nome_azienda: true,
          partita_iva: true,
          stato: true,
          stripe_subscription_id: true,
          stripe_subscription_status: true,
          licensed_operator_slots: true,
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

    const operatorCount = operatori.length;
    const monthlyPriceEur = calcCatLicensePriceEur(operatorCount);

    const bundleActive = await isCatBundleSubscriptionActive(orgId);

    return NextResponse.json({
      data: {
        cat: org,
        moduli: catalog,
        tecnici,
        pricing: {
          operatorCount,
          monthlyPriceEur,
          basePriceEur: CAT_BASE_PRICE_EUR,
          baseOperatorSlots: CAT_BASE_OPERATOR_SLOTS,
          extraOperatorPriceEur: CAT_EXTRA_OPERATOR_PRICE_EUR,
        },
        subscription: {
          active: bundleActive,
          status: org?.stripe_subscription_status ?? null,
          licensedOperatorSlots: org?.licensed_operator_slots ?? null,
        },
        stripeEnabled: isStripeConfigured(),
      },
    });
  } catch (error) {
    console.error('GET /api/cat/modules error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento dei moduli' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = assertCatAdmin(request);
    if (denied) return denied;

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
      return NextResponse.json({ error: 'Operatore non trovato nel tuo CAT' }, { status: 404 });
    }

    if (attivo) {
      const bundleActive = await isCatBundleSubscriptionActive(orgId);
      if (!bundleActive) {
        return NextResponse.json(
          { error: 'Sottoscrivi il pacchetto moduli tramite Stripe prima di attivare i moduli.' },
          { status: 402 }
        );
      }
    }

    await setModuleActiveForUser(
      utente_id,
      orgId,
      module_code as ModuleCode,
      attivo
    );

    const operatorCount = await prisma.utenti.count({
      where: { org_id: orgId, ruolo: 'operatore', attivo: true },
    });

    return NextResponse.json({
      success: true,
      pricing: {
        operatorCount,
        monthlyPriceEur: calcCatLicensePriceEur(operatorCount),
      },
    });
  } catch (error) {
    console.error('PUT /api/cat/modules error:', error);
    return NextResponse.json({ error: 'Errore nell\'aggiornamento del modulo' }, { status: 500 });
  }
}
