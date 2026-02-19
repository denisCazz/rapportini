import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOrgIdFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Impostazioni vuote di fallback (utile se tabella organizzazioni non esiste ancora)
const EMPTY_SETTINGS = {
  nomeAzienda: undefined as string | undefined,
  logo: undefined as string | undefined,
  indirizzo: undefined as string | undefined,
  partitaIva: undefined as string | undefined,
};

// GET - Ottieni impostazioni organizzazione (restituisce sempre 200, mai 500)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const orgId = getOrgIdFromRequest(request);

    const { data, error } = await supabase
      .from('organizzazioni')
      .select('org_id, nome_azienda, logo, indirizzo, partita_iva')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) {
      const msg = String((error as { message?: string })?.message ?? error);
      console.warn('Settings GET error:', error);
      // Colonna mancante (es. indirizzo) o tabella: restituisce vuoto
      if (msg.includes('does not exist') || msg.includes('column') || msg.includes('org_id') || msg.includes('42P01') || msg.includes('42703')) {
        console.warn('Esegui supabase/schema.sql nel SQL Editor di Supabase.');
      }
      return NextResponse.json(EMPTY_SETTINGS, { status: 200 });
    }

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
    const supabase = getSupabaseAdmin();
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo');

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Solo gli admin possono modificare le impostazioni' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nomeAzienda, logo, indirizzo, partitaIva } = body;

    const updateData: Record<string, unknown> = {};
    if (nomeAzienda !== undefined) updateData.nome_azienda = nomeAzienda || null;
    if (logo !== undefined) updateData.logo = logo || null;
    if (indirizzo !== undefined) updateData.indirizzo = indirizzo || null;
    if (partitaIva !== undefined) updateData.partita_iva = partitaIva || null;

    const { data, error } = await supabase
      .from('organizzazioni')
      .upsert(
        { org_id: orgId, ...updateData },
        { onConflict: 'org_id' }
      )
      .select()
      .single();

    if (error) {
      const errObj = error as { message?: string; code?: string };
      const msg = String(errObj?.message ?? error);
      const code = String(errObj?.code ?? '');
      const isTableMissing = msg.includes('does not exist') || msg.includes('relation') || code === '42P01';
      if (isTableMissing) {
        return NextResponse.json(
          {
            error: 'Tabella organizzazioni errata o mancante. Esegui supabase/schema.sql nel SQL Editor di Supabase.',
            code: 'TABLE_MISSING',
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      nomeAzienda: data?.nome_azienda || undefined,
      logo: data?.logo || undefined,
      indirizzo: data?.indirizzo || undefined,
      partitaIva: data?.partita_iva || undefined,
    });
  } catch (error: unknown) {
    console.error('Error updating settings:', error);
    const errMsg = error instanceof Error ? error.message : 'Errore nell\'aggiornamento delle impostazioni';
    // Restituisce sempre 503 (mai 500) per permettere al frontend di salvare in localStorage
    return NextResponse.json(
      {
        error: errMsg.includes('organizzazioni') || errMsg.includes('SUPABASE') || errMsg.includes('Configurazione')
          ? 'Tabella organizzazioni errata o configurazione Supabase mancante. Esegui supabase/schema.sql nel SQL Editor di Supabase.'
          : errMsg,
        code: 'SETTINGS_UPDATE_FAILED',
      },
      { status: 503 }
    );
  }
}
