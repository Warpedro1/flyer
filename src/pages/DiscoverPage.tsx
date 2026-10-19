import { Calendar, Map as MapIcon, MessageCircle, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { DiscoverFilters } from '../components/discover/DiscoverFilters.tsx';

import { EventFeedCard } from '../components/ui/EventFeedCard.tsx';
import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import { discoverEventsWithMode } from '../services/flyerApi.ts';
import type { DiscoveryMode, EventRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import { DISCOVER_DEFAULTS, FALLBACK_GEO } from '../utils/constants.ts';
import {
  type DiscoverFilters as Filters,
  filtersFromParams,
  filtersToParams,
  filtersToRequest,
} from '../utils/discoverFilters.ts';
import { friendlyGeoError } from '../utils/geoMessages.ts';

export default function DiscoverPage() {
  const navigate = useNavigate();
  // Os filtros vivem no URL: partilháveis e preservados ao voltar de um evento.
  const [searchParams, setSearchParams] = useSearchParams();
  const filterKey = filtersToParams(filtersFromParams(searchParams)).toString();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(filterKey)), [filterKey]);
  const setFilters = useCallback(
    (next: Filters) => setSearchParams(filtersToParams(next), { replace: true }),
    [setSearchParams],
  );
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
  const [mode, setMode] = useState<DiscoveryMode>('personalized');

  const loadDiscover = useCallback(
    async (nextPage: number, append: boolean) => {
      if (effectiveLat === null || effectiveLng === null) return;
      setDiscoverLoading(true);
      setDiscoverError(null);
      try {
        const { events: data, mode: nextMode } = await discoverEventsWithMode({
          latitude: effectiveLat,
          longitude: effectiveLng,
          ...filtersToRequest(filters, new Date()),
          page: nextPage,
          page_size: DISCOVER_DEFAULTS.pageSize,
        });
        setMode(nextMode);
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
    [effectiveLat, effectiveLng, filters],
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

  // O sentinela no fim da lista avisa quando entra no ecrã. Um listener no window não
  // serve: quem faz scroll é o <main> do AppLayout, não a janela.
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Volta a observar depois de cada página: o observador só avisa quando o sentinela
  // muda de estado, e num ecrã largo ele continua visível depois da 1.ª página (a lista
  // parava aí). Ao começar a observar, o browser avisa logo com o estado atual.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || discoverLoading || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [events.length, discoverLoading, hasMore]);

  return (
    <div className="p-4 pb-28 sm:p-8 md:pb-8">
      <div className="mb-8 mt-2 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Na Linha da Frente</h2>
          <p className="mt-1 text-gray-500">Experiências recomendadas para você</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <button
            type="button"
            data-tour="my-events"
            onClick={() => navigate('/events')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-red-600 md:flex-none"
          >
            <Calendar className="h-5 w-5" />
            <span className="hidden sm:inline">Meus Eventos</span>
          </button>
          <button
            type="button"
            data-tour="map"
            onClick={() => navigate('/map')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-red-600 md:flex-none"
          >
            <MapIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Mapa</span>
          </button>
          <button
            type="button"
            data-tour="create-event"
            onClick={() => navigate('/events/new')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-red-200 transition-colors hover:bg-red-700 md:flex-none"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Criar</span>
          </button>
        </div>
      </div>

      <DiscoverFilters filters={filters} onChange={setFilters} />

      {geoLoading && (
        <div className="flex flex-col items-center py-12">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
            role="status"
            aria-label="Obtendo localização"
          />
          <p className="mt-3 text-gray-500">Obtendo sua posição...</p>
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
          Mostrando eventos perto de {FALLBACK_GEO.label}. Quando ativar o GPS, use
          &quot;Atualizar localização&quot; para ver resultados perto de você.
        </div>
      )}

      {mode === 'nearby' && !discoverError && (
        <div
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p>
            Ainda não conhecemos seus gostos: mostramos primeiro os eventos e lugares perto de você
            que agradam mais gente. Faça o onboarding no Chat para receber recomendações sob medida.
          </p>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <MessageCircle className="h-4 w-4" />
            Fazer o onboarding
          </button>
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

      <div ref={sentinelRef} aria-hidden="true" />

      {hasMore && !discoverLoading && events.length > 0 && (
        <div className="flex justify-center py-6">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-2xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition hover:border-red-200 hover:text-red-600"
          >
            Carregar mais
          </button>
        </div>
      )}

      {discoverLoading && events.length > 0 && (
        <div className="flex flex-col items-center py-8">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
            role="status"
          />
          <p className="mt-2 text-sm text-gray-500">Carregando mais eventos...</p>
        </div>
      )}

      {discoverLoading && events.length === 0 && !discoverError && effectiveLat !== null && (
        <div className="flex flex-col items-center py-16">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
            role="status"
          />
          <p className="mt-3 text-gray-500">Carregando eventos...</p>
        </div>
      )}

      {!discoverLoading &&
        events.length === 0 &&
        !discoverError &&
        effectiveLat !== null &&
        effectiveLng !== null && (
          <p className="py-12 text-center text-gray-500">
            Nenhum evento encontrado neste raio. Tente mais tarde.
          </p>
        )}

      {!hasMore && events.length > 0 && (
        <p className="py-8 text-center text-sm text-gray-500">Não há mais resultados por aqui.</p>
      )}
    </div>
  );
}
