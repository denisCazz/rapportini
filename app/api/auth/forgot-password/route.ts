import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { resolveAuthOrgId } from '@/lib/api-auth';
import crypto from 'crypto';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP, createRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey('forgot-password', clientIP);
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.forgotPassword);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: `Troppe richieste. Riprova tra ${rateLimitResult.retryAfter} secondi.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      );
    }

    const body = await request.json();
    const { email, org_id } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 });
    }

    const orgId = (
      org_id ||
      (await resolveAuthOrgId(request)) ||
      process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ||
      'default'
    ).trim();

    const emailTrim = email.trim().toLowerCase();
    const isEmail = emailTrim.includes('@');

    let utente: { id: string; username: string; email: string | null; nome: string; cognome: string } | null = null;

    if (isEmail) {
      utente = await prisma.utenti.findFirst({
        where: {
          org_id: orgId,
          attivo: true,
          email: { equals: emailTrim, mode: 'insensitive' },
        },
        select: { id: true, username: true, email: true, nome: true, cognome: true },
      });
    } else {
      utente = await prisma.utenti.findFirst({
        where: {
          org_id: orgId,
          attivo: true,
          username: { equals: emailTrim, mode: 'insensitive' },
        },
        select: { id: true, username: true, email: true, nome: true, cognome: true },
      });
    }

    if (!utente) {
      return NextResponse.json({
        success: true,
        message: "Se l'email è registrata, riceverai un link per reimpostare la password.",
      });
    }

    const userEmail = utente.email || utente.username;
    if (!userEmail || !userEmail.includes('@')) {
      return NextResponse.json({
        success: true,
        message: "Se l'email è registrata, riceverai un link per reimpostare la password.",
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    try {
      await prisma.passwordResetTokens.create({
        data: {
          user_id: utente.id,
          token,
          expires_at: expiresAt,
        },
      });
    } catch (e) {
      console.error('Errore creazione token reset:', e);
      return NextResponse.json({ error: 'Errore nella richiesta di reset' }, { status: 500 });
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
        ? "Se l'email è registrata, riceverai un link per reimpostare la password."
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
