import type { DiscoverRequest, EventCategory } from '../types/index.ts';

import { isEventCategory } from './categories.ts';
import { DISCOVER_DEFAULTS } from './constants.ts';

export type KindFilter = 'all' | 'event' | 'place';
/** 'any' | 'today' | 'weekend' | 'week' | um dia 'AAAA-MM-DD'. */
export type DateFilter = string;

export interface DiscoverFilters {
  kind: KindFilter;
  categories: EventCategory[];
  date: DateFilter;
  radiusKm: number;
  /** null = qualquer valor; 0 = só grátis. */
  maxPrice: number | null;
}

export const RADIUS_OPTIONS = [1, 5, 10, 25, 50] as const;
export const PRICE_OPTIONS = [0, 50, 100, 200] as const;

export const DEFAULT_FILTERS: DiscoverFilters = {
  kind: 'all',
  categories: [],
  date: 'any',
  radiusKm: DISCOVER_DEFAULTS.radiusKm,
  maxPrice: null,
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_PRESETS = new Set(['today', 'weekend', 'week']);

function isDateFilter(value: string): boolean {
  return DATE_PRESETS.has(value) || (DAY.test(value) && !Number.isNaN(parseDay(value).getTime()));
}

function parseDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** O estado dos filtros vive no URL: dá para partilhar e sobrevive ao voltar atrás. */
export function filtersFromParams(params: URLSearchParams): DiscoverFilters {
  const kind = params.get('tipo');
  const radius = Number(params.get('raio'));
  const price = params.get('preco');
  const date = params.get('data') ?? '';
  return {
    kind: kind === 'event' || kind === 'place' ? kind : 'all',
    categories: (params.get('cat') ?? '').split(',').filter(isEventCategory),
    date: isDateFilter(date) ? date : 'any',
    radiusKm: (RADIUS_OPTIONS as readonly number[]).includes(radius) ? radius : DEFAULT_FILTERS.radiusKm,
    maxPrice: price !== null && (PRICE_OPTIONS as readonly number[]).includes(Number(price)) ? Number(price) : null,
  };
}

export function filtersToParams(filters: DiscoverFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.kind !== 'all') params.set('tipo', filters.kind);
  if (filters.categories.length) params.set('cat', filters.categories.join(','));
  if (filters.date !== 'any') params.set('data', filters.date);
  if (filters.radiusKm !== DEFAULT_FILTERS.radiusKm) params.set('raio', String(filters.radiusKm));
  if (filters.maxPrice !== null) params.set('preco', String(filters.maxPrice));
  return params;
}

export function activeFilterCount(filters: DiscoverFilters): number {
  return [
    filters.kind !== 'all',
    filters.categories.length > 0,
    filters.date !== 'any',
    filters.radiusKm !== DEFAULT_FILTERS.radiusKm,
    filters.maxPrice !== null,
  ].filter(Boolean).length;
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function dateRange(date: DateFilter, now: Date): { from: Date; to: Date } | null {
  if (date === 'today') return { from: now, to: endOfDay(now) };
  if (date === 'week') return { from: now, to: new Date(now.getTime() + 7 * 24 * 3600 * 1000) };
  if (date === 'weekend') {
    const day = now.getDay(); // 0 = domingo, 6 = sábado
    if (day === 0) return { from: now, to: endOfDay(now) };
    const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day));
    const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
    return { from: day === 6 ? now : saturday, to: endOfDay(sunday) };
  }
  if (DAY.test(date)) {
    const day = parseDay(date);
    return { from: day, to: endOfDay(day) };
  }
  return null;
}

type FilterRequest = Pick<
  DiscoverRequest,
  'radius_km' | 'kinds' | 'categories' | 'date_from' | 'date_to' | 'max_price'
>;

/** Converte os filtros no corpo de POST /events/discover (hora local do aparelho). */
export function filtersToRequest(filters: DiscoverFilters, now: Date): FilterRequest {
  const req: FilterRequest = { radius_km: filters.radiusKm };
  if (filters.kind !== 'all') req.kinds = [filters.kind];
  if (filters.categories.length) req.categories = filters.categories;
  const range = dateRange(filters.date, now);
  if (range) {
    req.date_from = range.from.toISOString();
    req.date_to = range.to.toISOString();
  }
  if (filters.maxPrice !== null) req.max_price = String(filters.maxPrice);
  return req;
}
