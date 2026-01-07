import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Ottieni tutte le marche
export async function GET(request: NextRequest) {
  try {
    const { data: marche, error } = await supabase
      .from('marche')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;

    return NextResponse.json(marche || []);
  } catch (error: any) {
    console.error('Error fetching marche:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero delle marche' },
      { status: 500 }
    );
  }
}

// POST - Crea una nuova marca
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome } = body;

    if (!nome || !nome.trim()) {
      return NextResponse.json(
        { error: 'Il nome della marca è obbligatorio' },
        { status: 400 }
      );
    }

    const { data: marca, error } = await supabase
      .from('marche')
      .insert({ nome: nome.trim() })
      .select('id, nome')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Duplicato - cerca quella esistente
        const { data: existing } = await supabase
          .from('marche')
          .select('id, nome')
          .eq('nome', nome.trim())
          .single();
        
        if (existing) {
          return NextResponse.json(existing);
        }
      }
      throw error;
    }

    return NextResponse.json(marca);
  } catch (error: any) {
    console.error('Error creating marca:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nella creazione della marca' },
      { status: 500 }
    );
  }
}

