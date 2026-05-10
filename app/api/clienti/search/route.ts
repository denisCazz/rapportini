import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { Prisma } from '@prisma/client';

// GET - Cerca clienti esistenti per nome e cognome
export async function GET(request: NextRequest) {
  try {
    const orgId = getOrgIdFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const nome = searchParams.get('nome')?.trim();
    const cognome = searchParams.get('cognome')?.trim();
    const q = searchParams.get('q')?.trim();

    if (!nome && !cognome && !q) {
      return NextResponse.json([]);
    }

    const conditions: Prisma.ClientiWhereInput[] = [];

    if (q) {
      conditions.push({
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { cognome: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (nome) {
      conditions.push({ nome: { contains: nome, mode: 'insensitive' } });
    }
    if (cognome) {
      conditions.push({ cognome: { contains: cognome, mode: 'insensitive' } });
    }

    const where: Prisma.ClientiWhereInput = {
      org_id: orgId,
      AND: conditions.length ? conditions : undefined,
    };

    const clienti = await prisma.clienti.findMany({
      where,
      take: 10,
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        cognome: true,
        ragione_sociale: true,
        indirizzo: true,
        citta: true,
        cap: true,
        telefono: true,
        email: true,
        partita_iva: true,
        codice_fiscale: true,
      },
    });

    const risultati = clienti.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      cognome: cliente.cognome,
      ragioneSociale: cliente.ragione_sociale || '',
      indirizzo: cliente.indirizzo,
      citta: cliente.citta,
      cap: cliente.cap,
      telefono: cliente.telefono,
      email: cliente.email || '',
      partitaIva: cliente.partita_iva || '',
      codiceFiscale: cliente.codice_fiscale || '',
    }));

    return NextResponse.json(risultati);
  } catch (error: unknown) {
    console.error('Error searching clienti:', error);
    const message = error instanceof Error ? error.message : 'Errore nella ricerca clienti';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
