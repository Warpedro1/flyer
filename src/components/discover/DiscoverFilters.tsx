import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import type { EventCategory } from '../../types/index.ts';
import { EVENT_CATEGORIES } from '../../utils/categories.ts';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  type DiscoverFilters as Filters,
  type KindFilter,
  PRICE_OPTIONS,
  RADIUS_OPTIONS,
} from '../../utils/discoverFilters.ts';
import { formatMoney } from '../../utils/eventFormatters.ts';

export interface DiscoverFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
}

const KINDS: ReadonlyArray<{ value: KindFilter; label: string }> = [
  { value: 'all', label: 'Tudo' },
  { value: 'event', label: 'Eventos' },
  { value: 'place', label: 'Lugares' },
];

const DATES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'any', label: 'Qualquer data' },
  { value: 'today', label: 'Hoje' },
  { value: 'weekend', label: 'Fim de semana' },
  { value: 'week', label: 'Próximos 7 dias' },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-red-600 bg-red-600 text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-600'
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Painel de filtros da descoberta. Os lugares passam sempre nos filtros de data e valor. */
export function DiscoverFilters({ filters, onChange }: DiscoverFiltersProps) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);
  const isPreset = DATES.some((d) => d.value === filters.date);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggleCategory = (slug: EventCategory) =>
    set({
      categories: filters.categories.includes(slug)
        ? filters.categories.filter((c) => c !== slug)
        : [...filters.categories, slug],
    });

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
            count > 0
              ? 'border-red-600 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-700 hover:text-red-600'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {count > 0 ? `Filtros (${count})` : 'Filtros'}
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600"
          >
            <X className="h-4 w-4" />
            Limpar
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <Group label="Tipo">
            {KINDS.map((k) => (
              <Chip key={k.value} active={filters.kind === k.value} onClick={() => set({ kind: k.value })}>
                {k.label}
              </Chip>
            ))}
          </Group>

          <Group label="Data">
            {DATES.map((d) => (
              <Chip key={d.value} active={filters.date === d.value} onClick={() => set({ date: d.value })}>
                {d.label}
              </Chip>
            ))}
            <input
              type="date"
              aria-label="Escolher dia"
              value={isPreset ? '' : filters.date}
              onChange={(e) => set({ date: e.target.value || 'any' })}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                isPreset ? 'border-gray-200 text-gray-500' : 'border-red-600 text-red-700'
              }`}
            />
          </Group>

          <Group label="Distância">
            {RADIUS_OPTIONS.map((km) => (
              <Chip key={km} active={filters.radiusKm === km} onClick={() => set({ radiusKm: km })}>
                {km} km
              </Chip>
            ))}
          </Group>

          <Group label="Valor">
            <Chip active={filters.maxPrice === null} onClick={() => set({ maxPrice: null })}>
              Qualquer valor
            </Chip>
            {PRICE_OPTIONS.map((p) => (
              <Chip key={p} active={filters.maxPrice === p} onClick={() => set({ maxPrice: p })}>
                {p === 0 ? 'Grátis' : `Até ${formatMoney(p).replace(/,00$/, '')}`}
              </Chip>
            ))}
          </Group>

          <Group label="Categorias">
            {EVENT_CATEGORIES.map((c) => (
              <Chip key={c.slug} active={filters.categories.includes(c.slug)} onClick={() => toggleCategory(c.slug)}>
                {c.label}
              </Chip>
            ))}
          </Group>

          <p className="text-xs text-gray-500">
            Os lugares não têm data nem preço fixo: aparecem com qualquer data e valor.
          </p>
        </div>
      )}
    </div>
  );
}
