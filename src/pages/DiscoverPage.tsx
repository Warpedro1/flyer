import { Calendar, Map as MapIcon, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EventFeedCard } from '../components/ui/EventFeedCard.tsx';
import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import { discoverEvents } from '../services/flyerApi.ts';
import type { EventRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import { DISCOVER_DEFAULTS, FALLBACK_GEO } from '../utils/constants.ts';
import { friendlyGeoError } from '../utils/geoMessages.ts';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const {
    error: geoError,
    loading: geoLoading,
    refresh,
    effectiveLat,
    effectiveLng,
    chooseFallback,
    isEstimatedPosition,
  } = useEffectiveGeo();

  const [events, setEvents] = useState<EventRead[]>([]);
  const [page, setPage] = useState(1);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadDiscover = useCallback(
    async (nextPage: number, append: boolean) => {
      if (effectiveLat === null || effectiveLng === null) return;
      setDiscoverLoading(true);
      setDiscoverError(null);
      try {
        const data = await discoverEvents({
          latitude: effectiveLat,
          longitude: effectiveLng,
          radius_km: DISCOVER_DEFAULTS.radiusKm,
          page: nextPage,
          page_size: DISCOVER_DEFAULTS.pageSize,
        });
        setEvents((prev) => {
          if (!append) return data;
          const seen = new Set(prev.map((e) => e.id));
          const merged = [...prev];
          for (const e of data) {
            if (!seen.has(e.id)) {
              seen.add(e.id);
              merged.push(e);
            }
          }
          return merged;
        });
        setHasMore(data.length >= DISCOVER_DEFAULTS.pageSize);
        setPage(nextPage);
      } catch (err) {
        setDiscoverError(formatApiError(err));
      } finally {
        setDiscoverLoading(false);
      }
    },
    [effectiveLat, effectiveLng],
  );

  useEffect(() => {
    if (effectiveLat === null || effectiveLng === null) return;
    void loadDiscover(1, false);
  }, [effectiveLat, effectiveLng, loadDiscover]);

  const loadMore = useCallback(() => {
    if (
      !hasMore ||
      discoverLoading ||
      effectiveLat === null ||
      effectiveLng === null
    )
      return;
    void loadDiscover(page + 1, true);
  }, [hasMore, discoverLoading, effectiveLat, effectiveLng, page, loadDiscover]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 800
      ) {
        loadMoreRef.current();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="p-4 pb-28 sm:p-8 md:pb-8">
      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          readOnly
          placeholder="Pesquisar eventos, categorias..."
          className="w-full rounded-full border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
          aria-label="Pesquisa (em breve)"
        />
      </div>

      <div className="mb-8 mt-2 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Na Linha da Frente</h2>
          <p className="mt-1 text-gray-500">Experiências recomendadas para ti</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-red-600 md:flex-none"
          >
            <Calendar className="h-5 w-5" />
            <span className="hidden sm:inline">Meus Eventos</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-red-600 md:flex-none"
          >
            <MapIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Mapa</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/events/new')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-red-200 transition-colors hover:bg-red-700 md:flex-none"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Criar</span>
          </button>
        </div>
      </div>

      {geoLoading && (
        <div className="flex flex-col items-center py-12">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
            role="status"
            aria-label="A obter localização"
          />
          <p className="mt-3 text-gray-500">A obter a tua posição...</p>
        </div>
      )}

      {geoError && !geoLoading && (
        <div
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
          role="alert"
        >
          <p className="mb-3">{friendlyGeoError(geoError)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => refresh()}
              className="rounded-lg border border-gray-800 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => chooseFallback()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Continuar com {FALLBACK_GEO.label}
            </button>
          </div>
        </div>
      )}

      {isEstimatedPosition && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900" role="status">
          A mostrar eventos perto de {FALLBACK_GEO.label}. Quando ativares o GPS, usa
          &quot;Atualizar localização&quot; para resultados à tua volta.
        </div>
      )}

      {discoverError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          {discoverError}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {events.map((event) => (
          <EventFeedCard
            key={event.id}
            event={event}
            onOpen={() => navigate(`/events/${event.id}`)}
          />
        ))}
      </div>

      {discoverLoading && events.length > 0 && (
        <div className="flex flex-col items-center py-8">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
            role="status"
          />
          <p className="mt-2 text-sm text-gray-500">A carregar mais eventos...</p>
        </div>
      )}

      {discoverLoading && events.length === 0 && !discoverError && effectiveLat !== null && (
        <div className="flex flex-col items-center py-16">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
            role="status"
          />
          <p className="mt-3 text-gray-500">A carregar eventos...</p>
        </div>
      )}

      {!discoverLoading &&
        events.length === 0 &&
        !discoverError &&
        effectiveLat !== null &&
        effectiveLng !== null && (
          <p className="py-12 text-center text-gray-500">
            Nenhum evento encontrado neste raio. Tenta mais tarde.
          </p>
        )}

      {!hasMore && events.length > 0 && (
        <p className="py-8 text-center text-sm text-gray-500">Chegaste ao fim da lista.</p>
      )}
    </div>
  );
}
