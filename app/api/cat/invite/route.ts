import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import { buildOperatorInviteUrl } from '@/lib/cat-org';
import { isCatAdmin } from '@/lib/roles';
import { getAppBaseUrl } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    if (!isCatAdmin(userRole)) {
      return NextResponse.json({ error: 'Accesso riservato agli amministratori CAT' }, { status: 403 });
    }

    const orgId = getOrgIdFromRequest(request);

    let org = await prisma.organizzazioni.findFirst({
      where: { org_id: orgId, tipo: 'cat' },
      select: {
        org_id: true,
        nome_azienda: true,
        partita_iva: true,
        stato: true,
        invite_token: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'CAT non trovato' }, { status: 404 });
    }

    if (!org.invite_token) {
      org = await prisma.organizzazioni.update({
        where: { org_id: orgId },
        data: { invite_token: randomUUID(), updated_at: new Date() },
        select: {
          org_id: true,
          nome_azienda: true,
          partita_iva: true,
          stato: true,
          invite_token: true,
        },
      });
    }

    const baseUrl = getAppBaseUrl();
    const inviteUrl = buildOperatorInviteUrl(org.invite_token!, baseUrl);

    return NextResponse.json({
      data: {
        invite_url: inviteUrl,
        ragione_sociale: org.nome_azienda,
        partita_iva: org.partita_iva,
        stato: org.stato,
      },
    });
  } catch (error) {
    console.error('GET /api/cat/invite error:', error);
    return NextResponse.json({ error: 'Errore nel recupero del link invito' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    if (!isCatAdmin(userRole)) {
      return NextResponse.json({ error: 'Accesso riservato agli amministratori CAT' }, { status: 403 });
    }

    const orgId = getOrgIdFromRequest(request);
    const newToken = randomUUID();

    const org = await prisma.organizzazioni.update({
      where: { org_id: orgId, tipo: 'cat' },
      data: { invite_token: newToken, updated_at: new Date() },
      select: {
        nome_azienda: true,
        partita_iva: true,
        stato: true,
        invite_token: true,
      },
    });

    const baseUrl = getAppBaseUrl();
    const inviteUrl = buildOperatorInviteUrl(org.invite_token!, baseUrl);

    return NextResponse.json({
      success: true,
      data: {
        invite_url: inviteUrl,
        ragione_sociale: org.nome_azienda,
        partita_iva: org.partita_iva,
        stato: org.stato,
      },
    });
  } catch (error) {
    console.error('POST /api/cat/invite error:', error);
    return NextResponse.json({ error: 'Errore nella rigenerazione del link invito' }, { status: 500 });
  }
}
