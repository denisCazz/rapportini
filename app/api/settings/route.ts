import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { isOrgAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const EMPTY_SETTINGS = {
  nomeAzienda: undefined as string | undefined,
  logo: undefined as string | undefined,
  indirizzo: undefined as string | undefined,
  partitaIva: undefined as string | undefined,
};

// GET - Ottieni impostazioni organizzazione (restituisce sempre 200, mai 500)
export async function GET(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);

    const data = await prisma.organizzazioni.findUnique({
      where: { org_id: orgId },
      select: {
        org_id: true,
        nome_azienda: true,
        logo: true,
        indirizzo: true,
        partita_iva: true,
      },
    });

    if (!data) {
      return NextResponse.json(EMPTY_SETTINGS, { status: 200 });
    }

    return NextResponse.json({
      nomeAzienda: data.nome_azienda || undefined,
      logo: data.logo || undefined,
      indirizzo: data.indirizzo || undefined,
      partitaIva: data.partita_iva || undefined,
    });
  } catch (error: unknown) {
    console.warn('Settings GET exception:', error);
    return NextResponse.json(EMPTY_SETTINGS, { status: 200 });
  }
}

// PUT - Aggiorna impostazioni organizzazione
export async function PUT(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo');

    if (!isOrgAdminRole(userRole)) {
      return NextResponse.json({ error: 'Solo gli amministratori possono modificare le impostazioni' }, { status: 403 });
    }

    const body = await request.json();
    const { nomeAzienda, logo, indirizzo, partitaIva } = body;

    const data = await prisma.organizzazioni.upsert({
      where: { org_id: orgId },
      create: {
        org_id: orgId,
        nome_azienda: nomeAzienda ?? null,
        logo: logo ?? null,
        indirizzo: indirizzo ?? null,
        partita_iva: partitaIva ?? null,
      },
      update: {
        ...(nomeAzienda !== undefined ? { nome_azienda: nomeAzienda || null } : {}),
        ...(logo !== undefined ? { logo: logo || null } : {}),
        ...(indirizzo !== undefined ? { indirizzo: indirizzo || null } : {}),
        ...(partitaIva !== undefined ? { partita_iva: partitaIva || null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      nomeAzienda: data.nome_azienda || undefined,
      logo: data.logo || undefined,
      indirizzo: data.indirizzo || undefined,
      partitaIva: data.partita_iva || undefined,
    });
  } catch (error: unknown) {
    console.error('Error updating settings:', error);
    const errMsg = error instanceof Error ? error.message : "Errore nell'aggiornamento delle impostazioni";
    return NextResponse.json(
      {
        error: errMsg.includes('organizzazioni') || errMsg.includes('DATABASE')
          ? 'Tabella organizzazioni o DATABASE_URL non configurato. Esegui prisma migrate / schema SQL.'
          : errMsg,
        code: 'SETTINGS_UPDATE_FAILED',
      },
      { status: 503 }
    );
  }
}
