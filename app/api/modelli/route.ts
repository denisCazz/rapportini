import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Ottieni modelli filtrati per marca
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marcaId = searchParams.get('marca_id');

    let query = supabase
      .from('modelli')
      .select('id, nome, marca_id')
      .order('nome', { ascending: true });

    if (marcaId) {
      query = query.eq('marca_id', marcaId);
    }

    const { data: modelli, error } = await query;

    if (error) throw error;

    return NextResponse.json(modelli || []);
  } catch (error: any) {
    console.error('Error fetching modelli:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero dei modelli' },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo modello
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, marca_id } = body;

    if (!nome || !nome.trim()) {
      return NextResponse.json(
        { error: 'Il nome del modello è obbligatorio' },
        { status: 400 }
      );
    }

    if (!marca_id) {
      return NextResponse.json(
        { error: 'L\'ID della marca è obbligatorio' },
        { status: 400 }
      );
    }

    const { data: modello, error } = await supabase
      .from('modelli')
      .insert({ nome: nome.trim(), marca_id })
      .select('id, nome, marca_id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Duplicato - cerca quello esistente
        const { data: existing } = await supabase
          .from('modelli')
          .select('id, nome, marca_id')
          .eq('nome', nome.trim())
          .eq('marca_id', marca_id)
          .single();
        
        if (existing) {
          return NextResponse.json(existing);
        }
      }
      throw error;
    }

    return NextResponse.json(modello);
  } catch (error: any) {
    console.error('Error creating modello:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nella creazione del modello' },
      { status: 500 }
    );
  }
}

