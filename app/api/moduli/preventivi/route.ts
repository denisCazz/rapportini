import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { isOrgAdminRole } from '@/lib/roles';
import { assertClienteInOrg } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';

const rigaSchema = z.object({
  descrizione: z.string().max(500).optional().nullable(),
  quantita: z.number().min(0).optional().default(1),
  prezzoUnitario: z.number().min(0).optional().default(0),
  tipo: z.enum(['materiale', 'manodopera']).optional().default('materiale'),
});

// Nessun campo obbligatorio: tutto è opzionale
const createSchema = z.object({
  clienteId: z.string().uuid().optional().nullable(),
  clienteNome: z.string().max(255).optional().nullable(),
  clienteEmail: z.string().max(255).optional().nullable(),
  titolo: z.string().max(255).optional().nullable(),
  note: z.string().max(4000).optional().nullable(),
  validoFino: z.string().optional().nullable(),
  righe: z.array(rigaSchema).optional().default([]),
});

function mapPreventivo(row: {
  id: string;
  numero: string;
  stato: string;
  totale: { toString(): string };
  note: string | null;
  titolo: string | null;
  cliente_nome: string | null;
  cliente_email: string | null;
  valido_fino: Date | null;
  rapportino_id: string | null;
  created_at: Date | null;
  clienti: { nome: string; cognome: string } | null;
  righe: Array<{
    id: string;
    descrizione: string | null;
    quantita: { toString(): string };
    prezzo_unitario: { toString(): string };
    tipo: string;
  }>;
}) {
  const clienteLabel = row.clienti
    ? `${row.clienti.nome} ${row.clienti.cognome}`.trim()
    : (row.cliente_nome || '');
  return {
    id: row.id,
    numero: row.numero,
    stato: row.stato,
    totale: Number(row.totale),
    titolo: row.titolo,
    note: row.note,
    clienteEmail: row.cliente_email,
    validoFino: row.valido_fino?.toISOString().slice(0, 10) ?? null,
    rapportinoId: row.rapportino_id,
    createdAt: row.created_at?.toISOString() ?? null,
    cliente: clienteLabel,
    righe: row.righe.map((r) => ({
      id: r.id,
      descrizione: r.descrizione ?? '',
      quantita: Number(r.quantita),
      prezzoUnitario: Number(r.prezzo_unitario),
      tipo: r.tipo,
    })),
  };
}

async function nextNumero(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.preventivi.count({
    where: { org_id: orgId, numero: { startsWith: `P-${year}-` } },
  });
  return `P-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PREVENTIVI);
    if (!auth.ok) return auth.response;

    const rows = await prisma.preventivi.findMany({
      where: {
        org_id: auth.user.org_id,
        ...(!isOrgAdminRole(auth.user.ruolo) ? { utente_id: auth.user.id } : {}),
      },
      include: {
        clienti: { select: { nome: true, cognome: true } },
        righe: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data: rows.map(mapPreventivo) });
  } catch (error) {
    console.error('GET preventivi error:', error);
    return NextResponse.json({ error: 'Errore caricamento preventivi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PREVENTIVI);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const d = parsed.data;
    if (d.clienteId) {
      const ok = await assertClienteInOrg(d.clienteId, auth.user.org_id);
      if (!ok) {
        return NextResponse.json({ error: 'Cliente non valido' }, { status: 403 });
      }
    }

    const righe = (d.righe ?? []).filter(
      (r) => (r.descrizione && r.descrizione.trim()) || (r.prezzoUnitario ?? 0) > 0
    );
    const totale = righe.reduce(
      (sum, r) => sum + (r.quantita ?? 1) * (r.prezzoUnitario ?? 0),
      0
    );
    const numero = await nextNumero(auth.user.org_id);

    const created = await prisma.preventivi.create({
      data: {
        org_id: auth.user.org_id,
        numero,
        cliente_id: d.clienteId || null,
        cliente_nome: d.clienteNome?.trim() || null,
        cliente_email: d.clienteEmail?.trim() || null,
        titolo: d.titolo?.trim() || null,
        utente_id: auth.user.id,
        stato: 'bozza',
        totale,
        note: d.note?.trim() || null,
        valido_fino: d.validoFino ? new Date(d.validoFino) : null,
        righe: {
          create: righe.map((r) => ({
            descrizione: r.descrizione?.trim() || null,
            quantita: r.quantita ?? 1,
            prezzo_unitario: r.prezzoUnitario ?? 0,
            tipo: r.tipo ?? 'materiale',
          })),
        },
      },
      include: {
        clienti: { select: { nome: true, cognome: true } },
        righe: true,
      },
    });

    return NextResponse.json({ data: mapPreventivo(created) }, { status: 201 });
  } catch (error) {
    console.error('POST preventivi error:', error);
    return NextResponse.json({ error: 'Errore creazione preventivo' }, { status: 500 });
  }
}
