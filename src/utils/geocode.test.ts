import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../mocks/server.ts';

import { geocodeAddress, reverseGeocode } from './geocode.ts';

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

describe('geocodeAddress', () => {
  it('retorna lat/lng/displayName do primeiro resultado', async () => {
    server.use(
      http.get(SEARCH_URL, () =>
        HttpResponse.json([{ lat: '-23.561', lon: '-46.656', display_name: 'Avenida Paulista, São Paulo' }]),
      ),
    );
    const result = await geocodeAddress('avenida paulista');
    expect(result).toEqual({ lat: -23.561, lng: -46.656, displayName: 'Avenida Paulista, São Paulo' });
  });

  it('retorna null quando não há resultados', async () => {
    server.use(http.get(SEARCH_URL, () => HttpResponse.json([])));
    expect(await geocodeAddress('zzz inexistente')).toBeNull();
  });

  it('retorna null para query vazia sem chamar a rede', async () => {
    expect(await geocodeAddress('   ')).toBeNull();
  });

  it('lança erro em falha HTTP', async () => {
    server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(geocodeAddress('lisboa')).rejects.toThrow(/geocode_http_500/);
  });
});

describe('reverseGeocode', () => {
  it('retorna o display_name', async () => {
    server.use(
      http.get(REVERSE_URL, () => HttpResponse.json({ display_name: 'Rua A, Cidade B' })),
    );
    expect(await reverseGeocode(-23.5, -46.6)).toBe('Rua A, Cidade B');
  });

  it('retorna null quando não há display_name', async () => {
    server.use(http.get(REVERSE_URL, () => HttpResponse.json({})));
    expect(await reverseGeocode(0, 0)).toBeNull();
  });
});
