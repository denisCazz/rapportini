import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOrgIdFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET - Ottieni impostazioni organizzazione
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const orgId = getOrgIdFromRequest(request);

    const { data, error } = await supabase
      .from('organizzazioni')
      .select('org_id, nome_azienda, logo, indirizzo, partita_iva')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        nomeAzienda: undefined,
        logo: undefined,
        indirizzo: undefined,
        partitaIva: undefined,
      });
    }

    return NextResponse.json({
      nomeAzienda: data.nome_azienda || undefined,
      logo: data.logo || undefined,
      indirizzo: data.indirizzo || undefined,
      partitaIva: data.partita_iva || undefined,
    });
  } catch (error: unknown) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel recupero delle impostazioni' },
      { status: 500 }
    );
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

    if (error) throw error;

    return NextResponse.json({
      success: true,
      nomeAzienda: data?.nome_azienda || undefined,
      logo: data?.logo || undefined,
      indirizzo: data?.indirizzo || undefined,
      partitaIva: data?.partita_iva || undefined,
    });
  } catch (error: unknown) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nell\'aggiornamento delle impostazioni' },
      { status: 500 }
    );
  }
}
