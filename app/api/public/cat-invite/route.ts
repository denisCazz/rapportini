import { NextRequest, NextResponse } from 'next/server';
import { findCatOrgByInviteToken } from '@/lib/cat-org';
import { CAT_STATO } from '@/lib/cat-status';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Token invito mancante' }, { status: 400 });
    }

    const cat = await findCatOrgByInviteToken(token);
    if (!cat) {
      return NextResponse.json({ error: 'Link di invito non valido' }, { status: 404 });
    }

    if (cat.stato !== CAT_STATO.ATTIVO) {
      return NextResponse.json(
        {
          error:
            cat.stato === CAT_STATO.IN_ATTESA
              ? 'Il CAT non è ancora stato approvato. Riprova più tardi.'
              : 'Il CAT non è attivo. Contatta il tuo centro assistenza.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: {
        ragione_sociale: cat.nome_azienda,
        partita_iva: cat.partita_iva,
      },
    });
  } catch (error) {
    console.error('GET /api/public/cat-invite error:', error);
    return NextResponse.json({ error: 'Errore nel recupero dell\'invito' }, { status: 500 });
  }
}
