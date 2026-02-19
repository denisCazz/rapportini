import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest, getOrgIdFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET - Esporta dati personali dell'utente (diritto di accesso GDPR Art. 15)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Dati utente
    const { data: utente, error: utenteError } = await supabase
      .from('utenti')
      .select('id, username, nome, cognome, email, telefono, qualifica, ruolo, created_at, ultimo_accesso')
      .eq('id', userId)
      .eq('org_id', orgId)
      .single();

    if (utenteError || !utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    // Rapportini creati dall'utente
    const { data: rapportini } = await supabase
      .from('rapportini')
      .select(`
        id,
        data_intervento,
        ora_intervento,
        tipo_stufa,
        tipo_intervento,
        cliente:clienti(nome, cognome, indirizzo, citta)
      `)
      .eq('utente_id', userId)
      .eq('org_id', orgId)
      .order('data_intervento', { ascending: false })
      .limit(500);

    const exportData = {
      exportDate: new Date().toISOString(),
      dataSubject: 'Dati personali dell\'utente',
      user: {
        id: utente.id,
        username: utente.username,
        nome: utente.nome,
        cognome: utente.cognome,
        email: utente.email || null,
        telefono: utente.telefono || null,
        qualifica: utente.qualifica || null,
        ruolo: utente.ruolo,
        dataRegistrazione: utente.created_at,
        ultimoAccesso: utente.ultimo_accesso || null,
      },
      rapportiniCreati: (rapportini || []).map((r: any) => ({
        id: r.id,
        data: r.data_intervento,
        ora: r.ora_intervento,
        tipoStufa: r.tipo_stufa,
        tipoIntervento: r.tipo_intervento,
        cliente: r.cliente ? `${r.cliente.nome} ${r.cliente.cognome} - ${r.cliente.indirizzo}, ${r.cliente.citta}` : null,
      })),
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="dati-personali-${utente.username}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: unknown) {
    console.error('GDPR export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nell\'esportazione' },
      { status: 500 }
    );
  }
}
