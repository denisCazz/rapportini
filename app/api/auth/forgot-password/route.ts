import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { resolveAuthOrgId } from '@/lib/api-auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, org_id } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email obbligatoria' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const orgId = (org_id || (await resolveAuthOrgId(request, supabase)) || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || 'default').trim();

    const emailTrim = email.trim().toLowerCase();
    const isEmail = emailTrim.includes('@');

    let utente: { id: string; username: string; email: string | null; nome: string; cognome: string } | null = null;

    if (isEmail) {
      const { data, error } = await supabase
        .from('utenti')
        .select('id, username, email, nome, cognome')
        .eq('org_id', orgId)
        .eq('attivo', true)
        .ilike('email', emailTrim)
        .maybeSingle();
      if (!error) utente = data;
    } else {
      const { data, error } = await supabase
        .from('utenti')
        .select('id, username, email, nome, cognome')
        .eq('org_id', orgId)
        .eq('attivo', true)
        .ilike('username', emailTrim)
        .maybeSingle();
      if (!error) utente = data;
    }

    if (!utente) {
      return NextResponse.json({
        success: true,
        message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.',
      });
    }

    const userEmail = utente.email || utente.username;
    if (!userEmail || !userEmail.includes('@')) {
      return NextResponse.json({
        success: true,
        message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: utente.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Errore creazione token reset:', insertError);
      return NextResponse.json(
        { error: 'Errore nella richiesta di reset' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const sent = await sendEmail({
      to: userEmail,
      subject: 'Reimpostazione password - Bitora',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reimpostazione password</h2>
          <p>Ciao ${utente.nome || 'Utente'},</p>
          <p>Hai richiesto di reimpostare la password per il tuo account Bitora.</p>
          <p>Clicca sul link qui sotto per impostare una nuova password (valido per 1 ora):</p>
          <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 8px;">Reimposta password</a></p>
          <p>Se non hai richiesto tu questa operazione, ignora questa email.</p>
          <p style="color: #666; font-size: 12px;">Link diretto: ${resetUrl}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: sent
        ? 'Se l\'email è registrata, riceverai un link per reimpostare la password.'
        : 'Richiesta ricevuta. Controlla la configurazione email del server.',
    });
  } catch (error: unknown) {
    console.error('Errore forgot-password:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella richiesta' },
      { status: 500 }
    );
  }
}
