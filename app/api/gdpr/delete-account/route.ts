import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest, getOrgIdFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// DELETE - Cancella account richiesta (diritto all'oblio GDPR Art. 17)
// Richiede conferma password nel body
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { password, confirm } = body;

    if (!password || !confirm || confirm !== 'ELIMINA') {
      return NextResponse.json(
        { error: 'Conferma richiesta: invia password e confirm: "ELIMINA" nel body' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verifica password
    const { data: utente, error: utenteError } = await supabase
      .from('utenti')
      .select('id, username, password_hash')
      .eq('id', userId)
      .eq('org_id', orgId)
      .single();

    if (utenteError || !utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    const bcrypt = await import('bcryptjs');
    const passwordValid = await bcrypt.compare(password, utente.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Password non corretta' }, { status: 401 });
    }

    // Verifica che non sia l'ultimo admin
    const { data: me } = await supabase.from('utenti').select('ruolo').eq('id', userId).single();
    if (me?.ruolo === 'admin') {
      const { count: adminCount } = await supabase
        .from('utenti')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('ruolo', 'admin')
        .eq('attivo', true);
      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Impossibile eliminare: sei l\'unico admin. Assegna un altro admin prima di procedere.' },
          { status: 400 }
        );
      }
    }

    // Verifica rapportini assegnati
    const { count: rapportiniCount } = await supabase
      .from('rapportini')
      .select('*', { count: 'exact', head: true })
      .eq('utente_id', userId);

    if ((rapportiniCount ?? 0) > 0) {
      return NextResponse.json(
        { error: `Hai ${rapportiniCount ?? 0} rapportini creati. Contatta l\'amministratore per riassegnarli prima di eliminare l\'account.` },
        { status: 400 }
      );
    }

    // Disattiva account (soft delete invece di eliminazione fisica per audit trail)
    const { error: updateError } = await supabase
      .from('utenti')
      .update({
        attivo: false,
        email: null,
        telefono: null,
        qualifica: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('org_id', orgId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Account disattivato. I dati saranno cancellati definitivamente secondo la policy di retention.',
    });
  } catch (error: unknown) {
    console.error('GDPR delete account error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella cancellazione' },
      { status: 500 }
    );
  }
}
