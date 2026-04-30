import { List, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import EventMap from '../components/map/EventMap.tsx';
import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import { discoverEvents } from '../services/flyerApi.ts';
import type { EventRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import { DISCOVER_DEFAULTS, FALLBACK_GEO } from '../utils/constants.ts';
import { friendlyGeoError } from '../utils/geoMessages.ts';

export default function MapPage() {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (effectiveLat === null || effectiveLng === null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await discoverEvents({
        latitude: effectiveLat,
        longitude: effectiveLng,
        radius_km: DISCOVER_DEFAULTS.radiusKm,
        page: 1,
        page_size: 50,
      });
      setEvents(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [effectiveLat, effectiveLng]);

  useEffect(() => {
    void load();
  }, [load]);

  const userPosition =
    effectiveLat !== null && effectiveLng !== null
      ? { lat: effectiveLat, lng: effectiveLng }
      : null;

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col md:min-h-[calc(100dvh-0px)]">
      <div className="absolute left-4 right-4 top-4 z-[500] flex justify-center gap-3 md:left-auto md:right-6 md:top-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-lg backdrop-blur-md transition hover:bg-white"
        >
          <List className="h-4 w-4" />
          Lista
        </button>
        <button
          type="button"
          onClick={() => navigate('/events/new')}
          className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          Criar
        </button>
      </div>

      <div className="min-h-0 flex-1 p-4 pt-20 md:p-6 md:pt-24">
        {geoLoading && (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          </div>
        )}

        {geoError && !geoLoading && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2">{friendlyGeoError(geoError)}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => refresh()}
                className="rounded-lg border border-gray-800 bg-white px-3 py-1.5 text-sm"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => chooseFallback()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white"
              >
                {FALLBACK_GEO.label}
              </button>
            </div>
          </div>
        )}

        {isEstimatedPosition && (
          <p className="mb-3 text-center text-sm text-sky-800">
            Posição aproximada ({FALLBACK_GEO.label}).
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        )}

        {!geoLoading && userPosition && (
          <div className="h-[min(70vh,560px)] min-h-[280px] overflow-hidden rounded-3xl border border-gray-200 shadow-sm">
            <EventMap events={events} userPosition={userPosition} height={560} className="h-full" />
          </div>
        )}

        {loading && (
          <p className="mt-4 text-center text-sm text-gray-500">A actualizar marcadores...</p>
        )}
      </div>
    </div>
  );
}
