import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  nome: z.string().min(1).max(200),
  codice: z.string().max(64).optional().nullable(),
  descrizione: z.string().max(2000).optional().nullable(),
  materialeId: z.string().uuid().optional().nullable(),
  giacenza: z.number().int().min(0).default(0),
  sogliaMinima: z.number().int().min(0).default(5),
  prezzoUnitario: z.number().min(0).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.MAGAZZINO_RICAMBI);
    if (!auth.ok) return auth.response;

    const sottoSoglia = request.nextUrl.searchParams.get('sottoSoglia') === '1';

    const items = await prisma.magazzinoRicambi.findMany({
      where: { org_id: auth.user.org_id },
      orderBy: [{ nome: 'asc' }],
    });

    const mapped = items.map((row) => ({
      id: row.id,
      nome: row.nome,
      codice: row.codice,
      descrizione: row.descrizione,
      materialeId: row.materiale_id,
      giacenza: row.giacenza,
      sogliaMinima: row.soglia_minima,
      prezzoUnitario: row.prezzo_unitario ? Number(row.prezzo_unitario) : null,
      sottoSoglia: row.giacenza <= row.soglia_minima,
    }));

    const filtered = sottoSoglia ? mapped.filter((m) => m.sottoSoglia) : mapped;

    return NextResponse.json({
      data: {
        items: filtered,
        alertCount: mapped.filter((m) => m.sottoSoglia).length,
      },
    });
  } catch (error) {
    console.error('GET magazzino error:', error);
    return NextResponse.json({ error: 'Errore caricamento magazzino' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.MAGAZZINO_RICAMBI);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const d = parsed.data;
    const created = await prisma.magazzinoRicambi.create({
      data: {
        org_id: auth.user.org_id,
        nome: d.nome,
        codice: d.codice || null,
        descrizione: d.descrizione || null,
        materiale_id: d.materialeId || null,
        giacenza: d.giacenza,
        soglia_minima: d.sogliaMinima,
        prezzo_unitario: d.prezzoUnitario ?? null,
      },
    });

    return NextResponse.json({
      data: {
        id: created.id,
        nome: created.nome,
        giacenza: created.giacenza,
        sogliaMinima: created.soglia_minima,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST magazzino error:', error);
    return NextResponse.json({ error: 'Errore creazione ricambio' }, { status: 500 });
  }
}
