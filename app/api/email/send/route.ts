import { NextRequest, NextResponse } from 'next/server';
import { sendInterventoConfirmation } from '@/lib/email';
import { Rapportino } from '@/types';

export const dynamic = 'force-dynamic';

// POST - Invia email di conferma intervento
export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    
    // Solo utenti autenticati possono inviare email
    if (!userRole) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rapportino, aziendaNome } = body as { rapportino: Rapportino; aziendaNome?: string };

    if (!rapportino) {
      return NextResponse.json(
        { error: 'Rapportino non fornito' },
        { status: 400 }
      );
    }

    if (!rapportino.cliente.email) {
      return NextResponse.json(
        { error: 'Email cliente non disponibile' },
        { status: 400 }
      );
    }

    const result = await sendInterventoConfirmation(rapportino, aziendaNome);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Errore nell\'invio dell\'email' },
      { status: 500 }
    );
  }
}
