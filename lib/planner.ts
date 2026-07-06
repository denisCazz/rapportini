/** Utilità per geocoding e ottimizzazione percorsi (nearest-neighbor + Haversine). */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RouteStop {
  interventoId: string;
  titolo: string;
  clienteId?: string;
  clienteNome?: string;
  indirizzo: string;
  citta: string;
  telefono?: string;
  oraPianificata?: string;
  lat: number;
  lng: number;
}

export interface OptimizedRoute {
  stops: RouteStop[];
  distanzaTotaleKm: number;
  durataStimataMin: number;
  senzaCoordinate: number;
}

const EARTH_RADIUS_KM = 6371;
const AVG_SPEED_KMH = 40;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function buildClienteAddress(parts: {
  indirizzo: string;
  citta: string;
  cap?: string;
  provincia?: string | null;
}): string {
  const capProv = [parts.cap, parts.provincia].filter(Boolean).join(' ');
  return [parts.indirizzo, parts.citta, capProv, 'Italia'].filter(Boolean).join(', ');
}

/** Coordinate approssimative per città italiane comuni (fallback senza API esterna). */
const ITALIAN_CITY_COORDS: Record<string, GeoPoint> = {
  roma: { lat: 41.9028, lng: 12.4964 },
  milano: { lat: 45.4642, lng: 9.19 },
  napoli: { lat: 40.8518, lng: 14.2681 },
  torino: { lat: 45.0703, lng: 7.6869 },
  palermo: { lat: 38.1157, lng: 13.3615 },
  genova: { lat: 44.4056, lng: 8.9463 },
  bologna: { lat: 44.4949, lng: 11.3426 },
  firenze: { lat: 43.7696, lng: 11.2558 },
  bari: { lat: 41.1171, lng: 16.8719 },
  catania: { lat: 37.5079, lng: 15.083 },
  venezia: { lat: 45.4408, lng: 12.3155 },
  verona: { lat: 45.4384, lng: 10.9916 },
  padova: { lat: 45.4064, lng: 11.8768 },
  trieste: { lat: 45.6495, lng: 13.7768 },
  brescia: { lat: 45.5416, lng: 10.2118 },
  parma: { lat: 44.8015, lng: 10.3279 },
  modena: { lat: 44.6471, lng: 10.9252 },
  reggio_emilia: { lat: 44.6989, lng: 10.6297 },
  perugia: { lat: 43.1107, lng: 12.3908 },
  ancona: { lat: 43.6158, lng: 13.5189 },
};

export function approximateCityCoords(citta: string): GeoPoint | null {
  const key = citta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  return ITALIAN_CITY_COORDS[key] ?? null;
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'it');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'BitoraPlanner/1.0 (field-service-app)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;

    const lat = parseFloat(results[0].lat);
    const lng = parseFloat(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'object' && value !== null && 'toNumber' in value
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function optimizeRouteNearestNeighbor(
  depot: GeoPoint,
  stops: RouteStop[]
): OptimizedRoute {
  const withCoords = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const senzaCoordinate = stops.length - withCoords.length;

  if (withCoords.length === 0) {
    return { stops: [], distanzaTotaleKm: 0, durataStimataMin: 0, senzaCoordinate };
  }

  const remaining = [...withCoords];
  const ordered: RouteStop[] = [];
  let current = depot;
  let totalKm = 0;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(current, { lat: remaining[i].lat, lng: remaining[i].lng });
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];
    totalKm += nearestDist;
    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  totalKm += haversineKm(current, depot);

  const serviceMinPerStop = 45;
  const travelMin = (totalKm / AVG_SPEED_KMH) * 60;

  return {
    stops: ordered,
    distanzaTotaleKm: Math.round(totalKm * 10) / 10,
    durataStimataMin: Math.round(travelMin + ordered.length * serviceMinPerStop),
    senzaCoordinate,
  };
}

export function googleMapsDirectionsUrl(stops: RouteStop[], depot?: GeoPoint): string {
  const points: string[] = [];
  if (depot) points.push(`${depot.lat},${depot.lng}`);
  for (const stop of stops) {
    points.push(`${stop.lat},${stop.lng}`);
  }
  if (points.length === 0) return 'https://www.google.com/maps';
  if (points.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(points[0])}`;
  }
  const origin = points[0];
  const destination = points[points.length - 1];
  const waypoints = points.slice(1, -1);
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
