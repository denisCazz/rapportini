import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { updateUserSchema, changePasswordSchema, validateRequest } from '@/lib/validation';
import { getOrgIdFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET - Ottieni singolo utente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');
    const orgId = getOrgIdFromRequest(request);

    // Solo admin può vedere altri utenti, operatore solo se stesso
    if (userRole !== 'admin' && currentUserId !== id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 403 }
      );
    }

    const { data: utente, error } = await supabase
      .from('utenti')
      .select('id, username, ruolo, nome, cognome, telefono, email, qualifica, firma, attivo, ultimo_accesso, created_at')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !utente) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: utente });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nel recupero dell\'utente' },
      { status: 500 }
    );
  }
}

// PATCH - Aggiorna utente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');
    const orgId = getOrgIdFromRequest(request);

    // Solo admin può modificare altri utenti
    const isAdmin = userRole === 'admin';
    const isSelf = currentUserId === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validazione
    const validation = validateRequest(updateUserSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Solo admin può cambiare ruolo e stato attivo
    if (!isAdmin) {
      delete updateData.ruolo;
      delete updateData.attivo;
    }

    // Non permettere di disattivare se stesso
    if (isSelf && updateData.attivo === false) {
      return NextResponse.json(
        { error: 'Non puoi disattivare il tuo account' },
        { status: 400 }
      );
    }

    const { data: updatedUser, error } = await supabase
      .from('utenti')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id, username, ruolo, nome, cognome, telefono, email, qualifica, firma, attivo')
      .single();

    if (error) throw error;

    return NextResponse.json({ data: updatedUser, success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nell\'aggiornamento dell\'utente' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina utente (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await params;
    const userRole = request.headers.get('x-user-ruolo');
    const currentUserId = request.headers.get('x-user-id');
    const orgId = getOrgIdFromRequest(request);

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 403 }
      );
    }

    // Non permettere di eliminare se stesso
    if (currentUserId === id) {
      return NextResponse.json(
        { error: 'Non puoi eliminare il tuo account' },
        { status: 400 }
      );
    }

    // Verifica che non sia l'ultimo admin
    const { count } = await supabase
      .from('utenti')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('ruolo', 'admin')
      .eq('attivo', true);

    const { data: userToDelete } = await supabase
      .from('utenti')
      .select('ruolo')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (userToDelete?.ruolo === 'admin' && (count || 0) <= 1) {
      return NextResponse.json(
        { error: 'Non puoi eliminare l\'ultimo admin' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('utenti')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nell\'eliminazione dell\'utente' },
      { status: 500 }
    );
  }
}
