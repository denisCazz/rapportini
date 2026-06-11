import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Rapportino } from '@/types';
import { getOrgIdFromRequest, getUserIdFromRequest } from '@/lib/api-auth';
import { canCreateRapportini, isOrgAdminRole } from '@/lib/roles';
import { rapportiniFilterSchema, rapportinoSchema, validateRequest, validateQueryParams } from '@/lib/validation';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP, createRateLimitKey } from '@/lib/rate-limit';
import { getSafeErrorMessage } from '@/lib/api-error';
import { mapClienteToDbData, mapDbRowToRapportino, mapInterventoToDbData } from '@/lib/rapportino-db';
import { parseDateOnly } from '@/lib/time-db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildRapportiniWhere(
  orgId: string,
  userRole: string,
  userId: string | null,
  filters: {
    tipoStufa?: 'pellet' | 'legno';
    dataInizio?: string;
    dataFine?: string;
    marca?: string;
    modello?: string;
    clienteId?: string;
    search?: string;
  },
  clientIdsFromSearch: string[] | undefined
): Prisma.RapportiniWhereInput {
  const where: Prisma.RapportiniWhereInput = { org_id: orgId };

  if (!isOrgAdminRole(userRole) && userId) {
    where.utente_id = userId;
  }
  if (filters.tipoStufa) {
    where.tipo_stufa = filters.tipoStufa;
  }
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.dataInizio) {
    dateFilter.gte = parseDateOnly(filters.dataInizio);
  }
  if (filters.dataFine) {
    dateFilter.lte = parseDateOnly(filters.dataFine);
  }
  if (Object.keys(dateFilter).length > 0) {
    where.data_intervento = dateFilter;
  }
  if (filters.marca) {
    where.marca = { contains: filters.marca, mode: 'insensitive' };
  }
  if (filters.modello) {
    where.modello = { contains: filters.modello, mode: 'insensitive' };
  }
  if (filters.clienteId) {
    where.cliente_id = filters.clienteId;
  }

  if (filters.search?.trim()) {
    const t = filters.search.trim();
    const searchOr: Prisma.RapportiniWhereInput[] = [
      { descrizione: { contains: t, mode: 'insensitive' } },
      { note: { contains: t, mode: 'insensitive' } },
      { marca: { contains: t, mode: 'insensitive' } },
      { modello: { contains: t, mode: 'insensitive' } },
    ];
    if (clientIdsFromSearch?.length) {
      searchOr.push({ cliente_id: { in: clientIdsFromSearch } });
    }
    const prevAnd = where.AND;
    const andList = Array.isArray(prevAnd) ? [...prevAnd] : prevAnd ? [prevAnd] : [];
    andList.push({ OR: searchOr });
    where.AND = andList;
  }

  return where;
}

// GET - Ottieni tutti i rapportini (filtrati per utente se operatore)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    const userRole = request.headers.get('x-user-ruolo') || 'operatore';

    const validation = validateQueryParams(rapportiniFilterSchema, request.nextUrl.searchParams);
    const filters = validation.success ? validation.data : { page: 1, limit: 20 };

    let clientIdsFromSearch: string[] | undefined;
    if (filters.search?.trim()) {
      const t = filters.search.trim();
      const rows = await prisma.clienti.findMany({
        where: {
          org_id: orgId,
          OR: [
            { nome: { contains: t, mode: 'insensitive' } },
            { cognome: { contains: t, mode: 'insensitive' } },
            { ragione_sociale: { contains: t, mode: 'insensitive' } },
            { citta: { contains: t, mode: 'insensitive' } },
            { indirizzo: { contains: t, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      clientIdsFromSearch = rows.map((r) => r.id);
    }

    const where = buildRapportiniWhere(orgId, userRole, userId, filters, clientIdsFromSearch);

    const offset = (filters.page - 1) * filters.limit;

    const [rapportini, count] = await Promise.all([
      prisma.rapportini.findMany({
        where,
        orderBy: { data_intervento: 'desc' },
        skip: offset,
        take: filters.limit,
        include: {
          utenti: {
            select: { id: true, nome: true, cognome: true, telefono: true, email: true, qualifica: true },
          },
          clienti: true,
        },
      }),
      prisma.rapportini.count({ where }),
    ]);

    const formattedRapportini: Rapportino[] = rapportini.map((r) => mapDbRowToRapportino(r));

    const totalPages = Math.ceil(count / filters.limit);

    const response = NextResponse.json({
      data: formattedRapportini,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1,
      },
    });
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching rapportini:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Errore nel recupero dei rapportini') },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo rapportino
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitKey = createRateLimitKey('createRapportino', clientIP);
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.createRapportino);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: `Troppe richieste. Riprova tra ${rateLimitResult.retryAfter} secondi.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rapportinoData = body.rapportino || body;
    const userId = getUserIdFromRequest(request);
    const orgId = getOrgIdFromRequest(request);
    let effectiveOrgId = orgId;

    if (!userId) {
      return NextResponse.json({ error: 'ID utente non fornito. Effettua il login.' }, { status: 401 });
    }

    const validation = validateRequest(rapportinoSchema, rapportinoData);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const rapportino = validation.data;

    let utente = await prisma.utenti.findFirst({
      where: { id: userId, org_id: effectiveOrgId },
      select: { id: true, ruolo: true, org_id: true },
    });

    if (!utente) {
      const fallback = await prisma.utenti.findFirst({
        where: { id: userId },
        select: { id: true, ruolo: true, org_id: true },
      });
      if (fallback) {
        utente = fallback;
        effectiveOrgId = fallback.org_id;
      }
    }

    if (!utente) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
    }

    if (!canCreateRapportini(utente.ruolo)) {
      return NextResponse.json({ error: 'Non hai i permessi per creare rapportini' }, { status: 403 });
    }

    const nomeNormalizzato = rapportino.cliente.nome.trim();
    const cognomeNormalizzato = rapportino.cliente.cognome.trim();
    const telefonoNormalizzato = rapportino.cliente.telefono.trim();

    let clienteId: string | null = null;

    let clienteData = await prisma.clienti.findFirst({
      where: {
        org_id: effectiveOrgId,
        nome: nomeNormalizzato,
        cognome: cognomeNormalizzato,
        telefono: telefonoNormalizzato,
      },
      select: { id: true },
    });

    if (clienteData) {
      clienteId = clienteData.id;
    } else {
      const clienteNomeCognome = await prisma.clienti.findFirst({
        where: {
          org_id: effectiveOrgId,
          nome: nomeNormalizzato,
          cognome: cognomeNormalizzato,
        },
        select: { id: true },
      });
      if (clienteNomeCognome) {
        clienteId = clienteNomeCognome.id;
      }
    }

    if (!clienteId) {
      try {
        const newCliente = await prisma.clienti.create({
          data: mapClienteToDbData(rapportino.cliente, effectiveOrgId),
          select: { id: true },
        });
        clienteId = newCliente.id;
      } catch (e: unknown) {
        if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
          const existingCliente = await prisma.clienti.findFirst({
            where: {
              org_id: effectiveOrgId,
              nome: nomeNormalizzato,
              cognome: cognomeNormalizzato,
              telefono: telefonoNormalizzato,
            },
            select: { id: true },
          });
          if (existingCliente) {
            clienteId = existingCliente.id;
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }
    }

    const interventoData = mapInterventoToDbData(rapportino.intervento);

    const newRapportino = await prisma.rapportini.create({
      data: {
        org_id: effectiveOrgId,
        utente_id: userId,
        cliente_id: clienteId!,
        ...interventoData,
        data_creazione: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: newRapportino.id, success: true });
  } catch (error: unknown) {
    console.error('Error creating rapportino:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Errore nella creazione del rapportino') },
      { status: 500 }
    );
  }
}
