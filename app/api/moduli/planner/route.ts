import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { MODULE_CODES } from '@/lib/modules';
import { requireModuleAccess } from '@/lib/module-api-auth';
import { isOrgAdminRole } from '@/lib/roles';
import {
  approximateCityCoords,
  buildClienteAddress,
  decimalToNumber,
  geocodeAddress,
  googleMapsDirectionsUrl,
  optimizeRouteNearestNeighbor,
  type GeoPoint,
  type RouteStop,
} from '@/lib/planner';

export const dynamic = 'force-dynamic';

const optimizeSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  utenteId: z.string().uuid().optional(),
  geocodificaMancanti: z.boolean().optional(),
});

async function resolveDepot(orgId: string): Promise<GeoPoint> {
  const org = await prisma.organizzazioni.findUnique({
    where: { org_id: orgId },
    select: { base_lat: true, base_lng: true, indirizzo: true },
  });

  const baseLat = decimalToNumber(org?.base_lat);
  const baseLng = decimalToNumber(org?.base_lng);
  if (baseLat != null && baseLng != null) {
    return { lat: baseLat, lng: baseLng };
  }

  if (org?.indirizzo?.trim()) {
    const geocoded = await geocodeAddress(org.indirizzo);
    if (geocoded) {
      await prisma.organizzazioni.update({
        where: { org_id: orgId },
        data: {
          base_lat: geocoded.lat,
          base_lng: geocoded.lng,
          updated_at: new Date(),
        },
      });
      return geocoded;
    }
  }

  return { lat: 41.9028, lng: 12.4964 };
}

async function ensureClienteCoords(
  cliente: {
    id: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string | null;
    lat: unknown;
    lng: unknown;
  },
  geocodificaMancanti: boolean
): Promise<GeoPoint | null> {
  const existingLat = decimalToNumber(cliente.lat);
  const existingLng = decimalToNumber(cliente.lng);
  if (existingLat != null && existingLng != null) {
    return { lat: existingLat, lng: existingLng };
  }

  if (!geocodificaMancanti) {
    const approx = approximateCityCoords(cliente.citta);
    return approx;
  }

  const address = buildClienteAddress(cliente);
  let coords = await geocodeAddress(address);
  if (!coords) {
    coords = approximateCityCoords(cliente.citta);
  }

  if (coords) {
    await prisma.clienti.update({
      where: { id: cliente.id },
      data: {
        lat: coords.lat,
        lng: coords.lng,
        geocoded_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  return coords;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PLANNER);
    if (!auth.ok) return auth.response;

    const { org_id: orgId, id: userId, ruolo } = auth.user;
    const dataParam = request.nextUrl.searchParams.get('data');
    const utenteIdParam = request.nextUrl.searchParams.get('utenteId');
    const geocodifica = request.nextUrl.searchParams.get('geocodifica') === 'true';

    if (!dataParam || !/^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
      return NextResponse.json({ error: 'Parametro data obbligatorio (YYYY-MM-DD)' }, { status: 400 });
    }

    const dataGiorno = new Date(dataParam);

    const where: Prisma.InterventiPianificatiWhereInput = {
      org_id: orgId,
      stato: 'pianificato',
      data_pianificata: dataGiorno,
    };

    if (utenteIdParam) {
      where.utente_id = utenteIdParam;
    } else if (!isOrgAdminRole(ruolo)) {
      where.utente_id = userId;
    }

    const [depot, interventi, tecnici] = await Promise.all([
      resolveDepot(orgId),
      prisma.interventiPianificati.findMany({
        where,
        include: {
          clienti: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              indirizzo: true,
              citta: true,
              cap: true,
              provincia: true,
              telefono: true,
              lat: true,
              lng: true,
            },
          },
        },
        orderBy: [{ ora_pianificata: 'asc' }, { titolo: 'asc' }],
      }),
      prisma.utenti.findMany({
        where: { org_id: orgId, ruolo: 'operatore', attivo: true },
        select: { id: true, nome: true, cognome: true },
        orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      }),
    ]);

    const stops: RouteStop[] = [];
    let senzaCoordinate = 0;

    for (const intervento of interventi) {
      if (!intervento.clienti) {
        senzaCoordinate += 1;
        continue;
      }

      const coords = await ensureClienteCoords(intervento.clienti, geocodifica);
      if (!coords) {
        senzaCoordinate += 1;
        continue;
      }

      stops.push({
        interventoId: intervento.id,
        titolo: intervento.titolo,
        clienteId: intervento.clienti.id,
        clienteNome: `${intervento.clienti.nome} ${intervento.clienti.cognome}`,
        indirizzo: intervento.clienti.indirizzo,
        citta: intervento.clienti.citta,
        telefono: intervento.clienti.telefono,
        oraPianificata: intervento.ora_pianificata
          ? intervento.ora_pianificata.toISOString().slice(11, 16)
          : undefined,
        lat: coords.lat,
        lng: coords.lng,
      });
    }

    const route = optimizeRouteNearestNeighbor(depot, stops);

    return NextResponse.json({
      data: {
        data: dataParam,
        depot,
        tecnici,
        percorso: route,
        totaleInterventi: interventi.length,
        senzaCoordinate: route.senzaCoordinate + senzaCoordinate,
        mapsUrl: googleMapsDirectionsUrl(route.stops, depot),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching planner route:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero del percorso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleAccess(request, MODULE_CODES.PLANNER);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = optimizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
    }

    const { data, utenteId, geocodificaMancanti = true } = parsed.data;
    const { org_id: orgId, id: userId, ruolo } = auth.user;

    const where: Prisma.InterventiPianificatiWhereInput = {
      org_id: orgId,
      stato: 'pianificato',
      data_pianificata: new Date(data),
    };

    if (utenteId) {
      where.utente_id = utenteId;
    } else if (!isOrgAdminRole(ruolo)) {
      where.utente_id = userId;
    }

    const [depot, interventi] = await Promise.all([
      resolveDepot(orgId),
      prisma.interventiPianificati.findMany({
        where,
        include: {
          clienti: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              indirizzo: true,
              citta: true,
              cap: true,
              provincia: true,
              telefono: true,
              lat: true,
              lng: true,
            },
          },
        },
      }),
    ]);

    const stops: RouteStop[] = [];

    for (const intervento of interventi) {
      if (!intervento.clienti) continue;
      const coords = await ensureClienteCoords(intervento.clienti, geocodificaMancanti);
      if (!coords) continue;

      stops.push({
        interventoId: intervento.id,
        titolo: intervento.titolo,
        clienteId: intervento.clienti.id,
        clienteNome: `${intervento.clienti.nome} ${intervento.clienti.cognome}`,
        indirizzo: intervento.clienti.indirizzo,
        citta: intervento.clienti.citta,
        telefono: intervento.clienti.telefono,
        oraPianificata: intervento.ora_pianificata
          ? intervento.ora_pianificata.toISOString().slice(11, 16)
          : undefined,
        lat: coords.lat,
        lng: coords.lng,
      });
    }

    const route = optimizeRouteNearestNeighbor(depot, stops);

    const baseHour = 8;
    const baseMinute = 0;
    let currentMinutes = baseHour * 60 + baseMinute;

    for (const stop of route.stops) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const ora = new Date(`1970-01-01T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);

      await prisma.interventiPianificati.update({
        where: { id: stop.interventoId },
        data: { ora_pianificata: ora, updated_at: new Date() },
      });

      currentMinutes += 45 + Math.round((haversineToNext(route, stop) / 40) * 60);
    }

    return NextResponse.json({
      data: {
        percorso: route,
        mapsUrl: googleMapsDirectionsUrl(route.stops, depot),
        orariAggiornati: route.stops.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error optimizing planner route:', error);
    const message = error instanceof Error ? error.message : 'Errore nell\'ottimizzazione del percorso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function haversineToNext(route: { stops: RouteStop[] }, stop: RouteStop): number {
  const idx = route.stops.findIndex((s) => s.interventoId === stop.interventoId);
  if (idx < 0 || idx >= route.stops.length - 1) return 0;
  const a = route.stops[idx];
  const b = route.stops[idx + 1];
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
