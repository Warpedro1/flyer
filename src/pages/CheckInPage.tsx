import axios from 'axios';
import { useEffect, useState } from 'react';

import EventMap from '../components/map/EventMap.tsx';
import { EventFeedCard } from '../components/ui/EventFeedCard.tsx';
import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import { checkIn, discoverEvents } from '../services/flyerApi.ts';
import type { EventRead, TrophyRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import { CHECKIN_DISCOVER_RADIUS_KM, FALLBACK_GEO } from '../utils/constants.ts';
import { friendlyGeoError } from '../utils/geoMessages.ts';

export default function CheckInPage() {
  const {
    latitude,
    longitude,
    error: geoError,
    loading: geoLoading,
    refresh,
    effectiveLat,
    effectiveLng,
    chooseFallback,
    isEstimatedPosition,
  } = useEffectiveGeo();

  const [events, setEvents] = useState<EventRead[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [trophy, setTrophy] = useState<TrophyRead | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const userPosition =
    effectiveLat !== null && effectiveLng !== null
      ? { lat: effectiveLat, lng: effectiveLng }
      : null;

  useEffect(() => {
    if (effectiveLat === null || effectiveLng === null) return;
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        const data = await discoverEvents({
          latitude: effectiveLat,
          longitude: effectiveLng,
          radius_km: CHECKIN_DISCOVER_RADIUS_KM,
          page: 1,
          page_size: 50,
        });
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) setListError(formatApiError(err));
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveLat, effectiveLng]);

  const handleCheckIn = async (eventId: string) => {
    if (isEstimatedPosition || latitude === null || longitude === null) {
      setCheckError(
        'O check-in usa a tua posição real para validar a distância ao evento. Ativa o GPS e permite a localização neste site (não uses apenas a posição aproximada de Lisboa).',
      );
      return;
    }
    setCheckingId(eventId);
    setCheckError(null);
    setTrophy(null);
    try {
      const t = await checkIn({
        event_id: eventId,
        lat: latitude,
        long: longitude,
      });
      setTrophy(t);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCheckError('Já obtiveste este troféu para este evento.');
      } else {
        setCheckError(formatApiError(err));
      }
    } finally {
      setCheckingId(null);
    }
  };

  const canCheckInPhysically =
    !isEstimatedPosition && latitude !== null && longitude !== null;

  return (
    <div className="pb-28 md:pb-8">
      <div className="px-4 pt-6 sm:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Check-in</h1>
        <p className="mt-1 text-gray-500">
          Escolhe um evento próximo e confirma a tua presença para ganhar troféus.
        </p>
      </div>

      <div className="px-4 pb-4 pt-4 sm:px-8">
        {geoLoading && (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          </div>
        )}

        {geoError && !geoLoading && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
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
                Ver eventos perto de {FALLBACK_GEO.label}
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-800/80">
              O check-in só funciona com GPS real; esta opção serve só para veres eventos na lista
              e no mapa.
            </p>
          </div>
        )}

        {isEstimatedPosition && (
          <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900" role="status">
            Lista baseada em {FALLBACK_GEO.label}. Para fazer check-in, ativa a localização real.
          </div>
        )}

        {!geoLoading && userPosition && (
          <div className="mb-4 overflow-hidden rounded-3xl border border-gray-200 shadow-sm">
            <EventMap events={events} userPosition={userPosition} height={280} />
          </div>
        )}

        {listError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            {listError}
          </div>
        )}

        {checkError && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            {checkError}
          </div>
        )}

        {trophy && (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <strong>Troféu desbloqueado:</strong> {trophy.name}
            {trophy.description && (
              <>
                <br />
                <span className="text-sm">{trophy.description}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-8">
        {listLoading && (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          </div>
        )}

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventFeedCard
              key={event.id}
              event={event}
              footer={
                <button
                  type="button"
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  disabled={checkingId !== null || !canCheckInPhysically}
                  title={!canCheckInPhysically ? 'Ativa o GPS para fazer check-in' : undefined}
                  onClick={() => void handleCheckIn(event.id)}
                >
                  {checkingId === event.id ? 'A confirmar…' : 'Fazer check-in'}
                </button>
              }
            />
          ))}
        </div>

        {!listLoading && events.length === 0 && !listError && userPosition && (
          <p className="py-8 text-center text-gray-500">
            Nenhum evento num raio de {CHECKIN_DISCOVER_RADIUS_KM} km. Aproxima-te do local ou
            verifica mais tarde.
          </p>
        )}
      </div>
    </div>
  );
}
