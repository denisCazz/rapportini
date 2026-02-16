import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getOrgIdFromRequest } from '@/lib/api-auth';

// GET - Ottieni materiali filtrati per modello
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const orgId = getOrgIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const modelloId = searchParams.get('modello_id');

    if (!modelloId) {
      return NextResponse.json(
        { error: 'L\'ID del modello è obbligatorio' },
        { status: 400 }
      );
    }

    const { data: modelloOwner, error: modelloOwnerError } = await supabaseAdmin
      .from('modelli')
      .select('id')
      .eq('id', modelloId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (modelloOwnerError) throw modelloOwnerError;

    if (!modelloOwner) {
      return NextResponse.json(
        { error: 'Modello non trovato per la società corrente' },
        { status: 404 }
      );
    }

    const { data: materiali, error } = await supabaseAdmin
      .from('materiali')
      .select('id, nome, descrizione, modello_id')
      .eq('org_id', orgId)
      .eq('modello_id', modelloId)
      .order('nome', { ascending: true });

    if (error) throw error;

    return NextResponse.json(materiali || []);
  } catch (error: any) {
    console.error('Error fetching materiali:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero dei materiali' },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo materiale
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const orgId = getOrgIdFromRequest(request);
    const body = await request.json();
    const { nome, descrizione, modello_id } = body;

    if (!nome || !nome.trim()) {
      return NextResponse.json(
        { error: 'Il nome del materiale è obbligatorio' },
        { status: 400 }
      );
    }

    if (!modello_id) {
      return NextResponse.json(
        { error: 'L\'ID del modello è obbligatorio' },
        { status: 400 }
      );
    }

    const { data: modelloOwner, error: modelloOwnerError } = await supabaseAdmin
      .from('modelli')
      .select('id')
      .eq('id', modello_id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (modelloOwnerError) throw modelloOwnerError;

    if (!modelloOwner) {
      return NextResponse.json(
        { error: 'Modello non trovato per la società corrente' },
        { status: 404 }
      );
    }

    const { data: materiale, error } = await supabaseAdmin
      .from('materiali')
      .insert({ 
        nome: nome.trim(), 
        descrizione: descrizione?.trim() || null,
        modello_id,
        org_id: orgId,
      })
      .select('id, nome, descrizione, modello_id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Duplicato - cerca quello esistente
        const { data: existing } = await supabaseAdmin
          .from('materiali')
          .select('id, nome, descrizione, modello_id')
          .eq('org_id', orgId)
          .eq('nome', nome.trim())
          .eq('modello_id', modello_id)
          .single();
        
        if (existing) {
          return NextResponse.json(existing);
        }
      }
      throw error;
    }

    return NextResponse.json(materiale);
  } catch (error: any) {
    console.error('Error creating materiale:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nella creazione del materiale' },
      { status: 500 }
    );
  }
}

