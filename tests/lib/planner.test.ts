import { describe, expect, it } from 'vitest';
import {
  haversineKm,
  optimizeRouteNearestNeighbor,
  approximateCityCoords,
  buildClienteAddress,
} from '@/lib/planner';

describe('planner', () => {
  it('calcola distanza Haversine tra due punti', () => {
    const roma = { lat: 41.9028, lng: 12.4964 };
    const milano = { lat: 45.4642, lng: 9.19 };
    const km = haversineKm(roma, milano);
    expect(km).toBeGreaterThan(470);
    expect(km).toBeLessThan(490);
  });

  it('ottimizza percorso con nearest neighbor', () => {
    const depot = { lat: 45.0, lng: 9.0 };
    const stops = [
      {
        interventoId: 'a',
        titolo: 'A',
        indirizzo: 'Via A',
        citta: 'A',
        lat: 45.1,
        lng: 9.1,
      },
      {
        interventoId: 'b',
        titolo: 'B',
        indirizzo: 'Via B',
        citta: 'B',
        lat: 45.05,
        lng: 9.05,
      },
      {
        interventoId: 'c',
        titolo: 'C',
        indirizzo: 'Via C',
        citta: 'C',
        lat: 45.3,
        lng: 9.3,
      },
    ];

    const route = optimizeRouteNearestNeighbor(depot, stops);
    expect(route.stops).toHaveLength(3);
    expect(route.stops[0].interventoId).toBe('b');
    expect(route.distanzaTotaleKm).toBeGreaterThan(0);
    expect(route.durataStimataMin).toBeGreaterThan(0);
  });

  it('restituisce coordinate approssimative per città italiane', () => {
    const coords = approximateCityCoords('Milano');
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeCloseTo(45.4642, 1);
  });

  it('costruisce indirizzo completo per geocoding', () => {
    const address = buildClienteAddress({
      indirizzo: 'Via Roma 1',
      citta: 'Bologna',
      cap: '40121',
      provincia: 'BO',
    });
    expect(address).toContain('Via Roma 1');
    expect(address).toContain('Bologna');
    expect(address).toContain('Italia');
  });
});
