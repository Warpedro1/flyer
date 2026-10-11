import { MapPin, X } from 'lucide-react';
import { useState } from 'react';

import { discoverEvents } from '../../services/flyerApi.ts';
import type { EventRead } from '../../types/index.ts';
import { FALLBACK_GEO } from '../../utils/constants.ts';

export interface PlacePickerProps {
  /** Centro da pesquisa: a posição de quem cria o evento, quando há. */
  near: { lat: number | null; lng: number | null };
  selected: EventRead | null;
  onSelect: (place: EventRead | null) => void;
}

const PLACES_RADIUS_KM = 25;

function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Escolher o lugar do Flyer onde o evento acontece (opcional). */
export function PlacePicker({ near, selected, onSelect }: PlacePickerProps) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<EventRead[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Só pede os lugares quando a pessoa começa a escrever.
  const ensureLoaded = async () => {
    if (places !== null || loading) return;
    setLoading(true);
    try {
      const rows = await discoverEvents({
        latitude: near.lat ?? FALLBACK_GEO.latitude,
        longitude: near.lng ?? FALLBACK_GEO.longitude,
        radius_km: PLACES_RADIUS_KM,
        kinds: ['place'],
        page_size: 50,
      });
      setPlaces(rows);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900">
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {selected.title}
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-full p-1 hover:bg-red-100"
          aria-label="Remover lugar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const q = plain(query.trim());
  const matches = q.length >= 2 && places ? places.filter((p) => plain(p.title).includes(q)).slice(0, 6) : [];

  return (
    <div>
      <input
        id="placeSearch"
        type="search"
        className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
        placeholder="Ex.: Teatro do Parque"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          void ensureLoaded();
        }}
      />
      {loading && <p className="mt-2 text-sm text-gray-500">A procurar lugares…</p>}
      {matches.length > 0 && (
        <ul className="mt-2 space-y-1">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                className="flex w-full flex-col rounded-xl border border-gray-100 px-3 py-2 text-left hover:border-red-200 hover:bg-red-50"
              >
                <span className="font-medium text-gray-900">{p.title}</span>
                {p.location_name && <span className="text-xs text-gray-500">{p.location_name}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length >= 2 && places !== null && !loading && matches.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Nenhum lugar com esse nome por perto.</p>
      )}
    </div>
  );
}
