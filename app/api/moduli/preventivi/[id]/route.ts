import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { isOrgAdminRole } from '@/lib/roles';
import { assertClienteInOrg } from '@/lib/tenant-context';

const rigaSchema = z.object({
  descrizione: z.string().max(500).optional().nullable(),
  quantita: z.number().min(0).optional().default(1),
  prezzoUnitario: z.number().min(0).optional().default(0),
  tipo: z.enum(['materiale', 'manodopera']).optional().default('materiale'),
});

const updateSchema = z.object({
  stato: z.enum(['bozza', 'inviato', 'accettato', 'rifiutato']).optional(),
  titolo: z.string().max(255).optional().nullable(),
  clienteId: z.string().uuid().optional().nullable(),
  clienteNome: z.string().max(255).optional().nullable(),
  clienteEmail: z.string().max(255).optional().nullable(),
  note: z.string().max(4000).optional().nullable(),
  validoFino: z.string().optional().nullable(),
  righe: z.array(rigaSchema).optional(),
});

function mapPreventivo(row: {
  id: string;
  numero: string;
  stato: string;
  totale: { toString(): string };
  note: string | null;
  titolo: string | null;
  cliente_id: string | null;
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
    clienteId: row.cliente_id,
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

const preventivoInclude = {
  clienti: { select: { nome: true, cognome: true } },
  righe: true,
} as const;

async function findPreventivo(id: string, orgId: string) {
  return prisma.preventivi.findFirst({
    where: { id, org_id: orgId },
    include: preventivoInclude,
  });
}

function canAccessPreventivo(
  preventivo: { utente_id: string | null },
  userId: string,
  ruolo: string
): boolean {
  return isOrgAdminRole(ruolo) || preventivo.utente_id === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PREVENTIVI);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const preventivo = await findPreventivo(id, auth.user.org_id);
    if (!preventivo) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 });
    }
    if (!canAccessPreventivo(preventivo, auth.user.id, auth.user.ruolo)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    return NextResponse.json({ data: mapPreventivo(preventivo) });
  } catch (error) {
    console.error('GET preventivo error:', error);
    return NextResponse.json({ error: 'Errore caricamento preventivo' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PREVENTIVI);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
    }

    const preventivo = await findPreventivo(id, auth.user.org_id);
    if (!preventivo) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 });
    }
    if (!canAccessPreventivo(preventivo, auth.user.id, auth.user.ruolo)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const d = parsed.data;
    const hasContentUpdate =
      d.titolo !== undefined ||
      d.clienteId !== undefined ||
      d.clienteNome !== undefined ||
      d.clienteEmail !== undefined ||
      d.note !== undefined ||
      d.validoFino !== undefined ||
      d.righe !== undefined;

    if (hasContentUpdate && (preventivo.stato === 'accettato' || preventivo.rapportino_id)) {
      return NextResponse.json(
        { error: 'Non è possibile modificare un preventivo già accettato' },
        { status: 400 }
      );
    }

    if (d.stato === 'accettato' && !preventivo.rapportino_id) {
      if (!preventivo.cliente_id && !d.clienteId) {
        return NextResponse.json(
          { error: 'Aggiungi un cliente al preventivo prima di convertirlo in rapportino' },
          { status: 400 }
        );
      }
      const clienteId = d.clienteId || preventivo.cliente_id;
      if (!clienteId) {
        return NextResponse.json(
          { error: 'Aggiungi un cliente al preventivo prima di convertirlo in rapportino' },
          { status: 400 }
        );
      }

      const materiali = preventivo.righe
        .filter((r) => r.tipo === 'materiale')
        .map((r) => `${r.descrizione ?? ''} x${r.quantita}`)
        .join(', ');

      const rapportino = await prisma.rapportini.create({
        data: {
          org_id: auth.user.org_id,
          utente_id: auth.user.id,
          cliente_id: clienteId,
          data_intervento: new Date(),
          ora_intervento: new Date('1970-01-01T09:00:00.000Z'),
          tipo_stufa: 'pellet',
          marca: 'Da preventivo',
          modello: preventivo.numero,
          tipo_intervento: 'Intervento da preventivo',
          descrizione: `Generato da preventivo ${preventivo.numero}.${preventivo.note ? `\n${preventivo.note}` : ''}`,
          materiali_utilizzati: materiali || null,
        },
      });

      const updated = await prisma.preventivi.update({
        where: { id },
        data: {
          stato: 'accettato',
          rapportino_id: rapportino.id,
          updated_at: new Date(),
        },
        include: preventivoInclude,
      });

      return NextResponse.json({
        data: {
          ...mapPreventivo(updated),
          rapportinoId: rapportino.id,
        },
      });
    }

    if (hasContentUpdate) {
      if (d.clienteId) {
        const ok = await assertClienteInOrg(d.clienteId, auth.user.org_id);
        if (!ok) {
          return NextResponse.json({ error: 'Cliente non valido' }, { status: 403 });
        }
      }

      const righeInput = d.righe ?? preventivo.righe.map((r) => ({
        descrizione: r.descrizione,
        quantita: Number(r.quantita),
        prezzoUnitario: Number(r.prezzo_unitario),
        tipo: r.tipo as 'materiale' | 'manodopera',
      }));

      const righe = righeInput.filter(
        (r) => (r.descrizione && r.descrizione.trim()) || (r.prezzoUnitario ?? 0) > 0
      );
      const totale = righe.reduce(
        (sum, r) => sum + (r.quantita ?? 1) * (r.prezzoUnitario ?? 0),
        0
      );

      const updated = await prisma.$transaction(async (tx) => {
        await tx.preventivoRighe.deleteMany({ where: { preventivo_id: id } });
        return tx.preventivi.update({
          where: { id },
          data: {
            ...(d.titolo !== undefined && { titolo: d.titolo?.trim() || null }),
            ...(d.clienteId !== undefined && {
              cliente_id: d.clienteId || null,
              ...(d.clienteId ? { cliente_nome: null } : {}),
            }),
            ...(d.clienteNome !== undefined && !d.clienteId && {
              cliente_nome: d.clienteNome?.trim() || null,
            }),
            ...(d.clienteEmail !== undefined && { cliente_email: d.clienteEmail?.trim() || null }),
            ...(d.note !== undefined && { note: d.note?.trim() || null }),
            ...(d.validoFino !== undefined && {
              valido_fino: d.validoFino ? new Date(d.validoFino) : null,
            }),
            ...(d.stato && { stato: d.stato }),
            totale,
            updated_at: new Date(),
            righe: {
              create: righe.map((r) => ({
                descrizione: r.descrizione?.trim() || null,
                quantita: r.quantita ?? 1,
                prezzo_unitario: r.prezzoUnitario ?? 0,
                tipo: r.tipo ?? 'materiale',
              })),
            },
          },
          include: preventivoInclude,
        });
      });

      return NextResponse.json({ data: mapPreventivo(updated) });
    }

    const updated = await prisma.preventivi.update({
      where: { id },
      data: {
        ...(d.stato && { stato: d.stato }),
        updated_at: new Date(),
      },
      include: preventivoInclude,
    });

    return NextResponse.json({ data: mapPreventivo(updated) });
  } catch (error) {
    console.error('PATCH preventivo error:', error);
    return NextResponse.json({ error: 'Errore aggiornamento preventivo' }, { status: 500 });
  }
}
