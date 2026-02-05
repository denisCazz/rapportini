import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { changePasswordSchema, validateRequest } from '@/lib/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// POST - Cambia password utente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');

    const isAdmin = userRole === 'admin';
    const isSelf = currentUserId === id;

    // Solo admin può cambiare password di altri utenti
    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Se è admin che cambia password di un altro utente, non serve la password attuale
    if (isAdmin && !isSelf) {
      const adminResetSchema = z.object({
        newPassword: z.string().min(8, 'Nuova password deve avere almeno 8 caratteri').max(100),
      });

      const validation = validateRequest(adminResetSchema, body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.errors.join(', ') },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(validation.data.newPassword, 12);

      const { error } = await supabase
        .from('utenti')
        .update({ password_hash: passwordHash })
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Password resettata con successo' });
    }

    // Utente che cambia la propria password
    const validation = validateRequest(changePasswordSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // Verifica password attuale
    const { data: utente, error: fetchError } = await supabase
      .from('utenti')
      .select('password_hash')
      .eq('id', id)
      .single();

    if (fetchError || !utente) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Verifica password attuale
    let isValidPassword = false;
    if (utente.password_hash.match(/^\$2[abxy]\$/)) {
      isValidPassword = await bcrypt.compare(currentPassword, utente.password_hash);
    } else {
      isValidPassword = currentPassword === utente.password_hash;
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Password attuale non corretta' },
        { status: 400 }
      );
    }

    // Hash nuova password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const { error } = await supabase
      .from('utenti')
      .update({ password_hash: passwordHash })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Password cambiata con successo' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel cambio password' },
      { status: 500 }
    );
  }
}
