import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token mancante o non valido' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La password deve avere almeno 8 caratteri' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: resetRow, error: fetchError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (fetchError || !resetRow) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 400 }
      );
    }

    if (resetRow.used_at) {
      return NextResponse.json(
        { error: 'Questo link è già stato utilizzato' },
        { status: 400 }
      );
    }

    if (new Date(resetRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Il link è scaduto. Richiedi un nuovo reset.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('utenti')
      .update({ password_hash: passwordHash })
      .eq('id', resetRow.user_id);

    if (updateError) throw updateError;

    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetRow.id);

    return NextResponse.json({
      success: true,
      message: 'Password aggiornata. Puoi effettuare il login.',
    });
  } catch (error: unknown) {
    console.error('Errore reset-password:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nell\'aggiornamento' },
      { status: 500 }
    );
  }
}
