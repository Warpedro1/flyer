import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  DEFAULT_FILTERS,
  filtersFromParams,
  filtersToParams,
  filtersToRequest,
} from './discoverFilters.ts';

// Quarta-feira, 14 de outubro de 2026, 15:00 (hora local do teste).
const NOW = new Date(2026, 9, 14, 15, 0, 0);

describe('filtros da descoberta no URL', () => {
  it('sem parâmetros usa os filtros por omissão: tudo, 10 km', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
    expect(DEFAULT_FILTERS).toEqual({
      kind: 'all',
      categories: [],
      date: 'any',
      radiusKm: 10,
      maxPrice: null,
    });
  });

  it('ida e volta pelo URL', () => {
    const filters = {
      kind: 'place' as const,
      categories: ['praia_natureza' as const, 'comida_bebida' as const],
      date: 'weekend',
      radiusKm: 5,
      maxPrice: 50,
    };

    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });

  it('os filtros por omissão não sujam o URL', () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('ignora valores inválidos no URL em vez de partir a página', () => {
    const params = new URLSearchParams('tipo=museu&cat=praia_natureza,nada&raio=999&preco=abc&data=ontem');

    expect(filtersFromParams(params)).toEqual({ ...DEFAULT_FILTERS, categories: ['praia_natureza'] });
  });

  it('conta os filtros ativos', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, kind: 'event', maxPrice: 0 })).toBe(2);
  });
});

describe('filtros → pedido ao backend', () => {
  it('sem filtros só manda o raio', () => {
    expect(filtersToRequest(DEFAULT_FILTERS, NOW)).toEqual({ radius_km: 10 });
  });

  it('tipo, categorias e valor', () => {
    const req = filtersToRequest(
      { ...DEFAULT_FILTERS, kind: 'place', categories: ['jogos'], maxPrice: 0 },
      NOW,
    );

    expect(req).toEqual({ radius_km: 10, kinds: ['place'], categories: ['jogos'], max_price: '0' });
  });

  it('hoje: de agora até ao fim do dia', () => {
    const req = filtersToRequest({ ...DEFAULT_FILTERS, date: 'today' }, NOW);

    expect(req.date_from).toBe(NOW.toISOString());
    expect(req.date_to).toBe(new Date(2026, 9, 14, 23, 59, 59, 999).toISOString());
  });

  it('fim de semana: de sábado a domingo à noite', () => {
    const req = filtersToRequest({ ...DEFAULT_FILTERS, date: 'weekend' }, NOW);

    expect(req.date_from).toBe(new Date(2026, 9, 17, 0, 0, 0, 0).toISOString());
    expect(req.date_to).toBe(new Date(2026, 9, 18, 23, 59, 59, 999).toISOString());
  });

  it('fim de semana visto no domingo: de agora até ao fim do domingo', () => {
    const sunday = new Date(2026, 9, 18, 11, 0, 0);
    const req = filtersToRequest({ ...DEFAULT_FILTERS, date: 'weekend' }, sunday);

    expect(req.date_from).toBe(sunday.toISOString());
    expect(req.date_to).toBe(new Date(2026, 9, 18, 23, 59, 59, 999).toISOString());
  });

  it('próximos 7 dias', () => {
    const req = filtersToRequest({ ...DEFAULT_FILTERS, date: 'week' }, NOW);

    expect(req.date_from).toBe(NOW.toISOString());
    expect(req.date_to).toBe(new Date(2026, 9, 21, 15, 0, 0).toISOString());
  });

  it('um dia escolhido: o dia inteiro', () => {
    const req = filtersToRequest({ ...DEFAULT_FILTERS, date: '2026-10-20' }, NOW);

    expect(req.date_from).toBe(new Date(2026, 9, 20, 0, 0, 0, 0).toISOString());
    expect(req.date_to).toBe(new Date(2026, 9, 20, 23, 59, 59, 999).toISOString());
  });
});
