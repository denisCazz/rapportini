import { NextRequest, NextResponse } from 'next/server';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { CAT_STATO, CAT_STATO_LABELS, CatStato } from '@/lib/cat-status';
import { buildOperatorInviteUrl } from '@/lib/cat-org';
import { isPlatformAdmin } from '@/lib/roles';
import { updateCatStatoSchema, validateRequest } from '@/lib/validation';
import { writeAuditLog } from '@/lib/audit-log';
import { getClientIP } from '@/lib/rate-limit';

function assertPlatformAdmin(userRole: string | null): NextResponse | null {
  if (!isPlatformAdmin(userRole)) {
    return NextResponse.json(
      { error: 'Accesso riservato all\'amministratore piattaforma' },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const denied = assertPlatformAdmin(request.headers.get('x-user-ruolo'));
    if (denied) return denied;

    const statoFilter = request.nextUrl.searchParams.get('stato');

    const cats = await prisma.organizzazioni.findMany({
      where: {
        tipo: 'cat',
        ...(statoFilter ? { stato: statoFilter } : {}),
      },
      orderBy: { created_at: 'desc' },
      select: {
        org_id: true,
        nome_azienda: true,
        partita_iva: true,
        indirizzo: true,
        codice_fiscale: true,
        pec: true,
        codice_destinatario_sdi: true,
        stato: true,
        invite_token: true,
        created_at: true,
        updated_at: true,
      },
    });

    const orgIds = cats.map((cat) => cat.org_id);

    const [operatorCounts, adminCats] = await Promise.all([
      prisma.utenti.groupBy({
        by: ['org_id'],
        where: { org_id: { in: orgIds }, ruolo: 'operatore', attivo: true },
        _count: { id: true },
      }),
      prisma.utenti.findMany({
        where: { org_id: { in: orgIds }, ruolo: 'admin_cat', attivo: true },
        select: {
          org_id: true,
          id: true,
          nome: true,
          cognome: true,
          username: true,
          email: true,
          telefono: true,
        },
      }),
    ]);

    const operatorCountByOrg = new Map(
      operatorCounts.map((row) => [row.org_id, row._count.id])
    );
    const adminByOrg = new Map(adminCats.map((row) => [row.org_id, row]));

    const data = cats.map((cat) => ({
      org_id: cat.org_id,
      ragione_sociale: cat.nome_azienda,
      partita_iva: cat.partita_iva,
      indirizzo: cat.indirizzo,
      codice_fiscale: cat.codice_fiscale,
      pec: cat.pec,
      codice_destinatario_sdi: cat.codice_destinatario_sdi,
      stato: cat.stato as CatStato,
      stato_label: CAT_STATO_LABELS[cat.stato as CatStato] || cat.stato,
      operatori_attivi: operatorCountByOrg.get(cat.org_id) ?? 0,
      admin_cat: adminByOrg.get(cat.org_id) ?? null,
      invite_url: cat.invite_token ? buildOperatorInviteUrl(cat.invite_token) : null,
      created_at: cat.created_at?.toISOString() ?? null,
      updated_at: cat.updated_at?.toISOString() ?? null,
    }));

    const pendingCount = data.filter((cat) => cat.stato === CAT_STATO.IN_ATTESA).length;

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
        in_attesa: pendingCount,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/cats error:', error);
    return NextResponse.json({ error: 'Errore nel caricamento dei CAT' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    const denied = assertPlatformAdmin(userRole);
    if (denied) return denied;

    const body = await request.json();
    const validation = validateRequest(updateCatStatoSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { org_id, stato } = validation.data;
    const adminUserId = getUserIdFromRequest(request);
    const adminOrgId = getOrgIdFromRequest(request);

    const cat = await prisma.organizzazioni.findFirst({
      where: { org_id, tipo: 'cat' },
      select: { org_id: true, stato: true, nome_azienda: true },
    });

    if (!cat) {
      return NextResponse.json({ error: 'CAT non trovato' }, { status: 404 });
    }

    const updated = await prisma.organizzazioni.update({
      where: { org_id },
      data: { stato, updated_at: new Date() },
      select: {
        org_id: true,
        nome_azienda: true,
        partita_iva: true,
        stato: true,
        updated_at: true,
      },
    });

    void writeAuditLog({
      org_id: adminOrgId,
      user_id: adminUserId,
      action: 'cat_stato_update',
      resource: `cat:${org_id}`,
      details: {
        previous_stato: cat.stato,
        new_stato: stato,
        ragione_sociale: cat.nome_azienda,
      },
      ip: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: {
        org_id: updated.org_id,
        ragione_sociale: updated.nome_azienda,
        partita_iva: updated.partita_iva,
        stato: updated.stato,
        stato_label: CAT_STATO_LABELS[updated.stato as CatStato] || updated.stato,
        updated_at: updated.updated_at?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('PATCH /api/admin/cats error:', error);
    return NextResponse.json({ error: 'Errore nell\'aggiornamento del CAT' }, { status: 500 });
  }
}
