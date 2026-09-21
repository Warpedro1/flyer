import axios from 'axios';
import { ArrowLeft, BellRing, Heart, QrCode, Share2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.ts';
import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import { checkIn, getEventById, joinEvent, leaveEvent } from '../services/flyerApi.ts';
import type { EventRead, TrophyRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import {
  formatEventDate,
  formatPriceLabel,
  formatRating,
  pickCoverImage,
  PLACEHOLDER_IMAGE,
} from '../utils/eventFormatters.ts';

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    latitude,
    longitude,
    isEstimatedPosition,
  } = useEffectiveGeo();

  const [event, setEvent] = useState<EventRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [trophy, setTrophy] = useState<TrophyRead | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const { user } = useAuth();

  const reload = useCallback(async () => {
    if (!id) return;
    const data = await getEventById(id);
    setEvent(data);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEventById(id);
        if (!cancelled) setEvent(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleJoin = async () => {
    if (!id) return;
    setRsvpBusy(true);
    setRsvpError(null);
    try {
      await joinEvent(id);
      await reload();
    } catch (err) {
      setRsvpError(formatApiError(err));
    } finally {
      setRsvpBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    setRsvpBusy(true);
    setRsvpError(null);
    try {
      await leaveEvent(id);
      await reload();
    } catch (err) {
      setRsvpError(formatApiError(err));
    } finally {
      setRsvpBusy(false);
    }
  };

  const capacity = event?.capacity_state ?? null;
  const isLimited = capacity?.capacity != null;
  const isFull = isLimited && capacity !== null && capacity.taken >= (capacity.capacity ?? 0);
  const myStatus = capacity?.my_status ?? null;
  const isCreator = Boolean(event?.creator_id && user?.id && event.creator_id === user.id);

  const cover = event ? pickCoverImage(event) ?? PLACEHOLDER_IMAGE : PLACEHOLDER_IMAGE;
  const { text: priceText } = event ? formatPriceLabel(event.price) : { text: '—' };
  const { date: dateStr, time: timeStr } = event
    ? formatEventDate(event.event_date)
    : { date: '—', time: '' };

  const canCheckInPhysically =
    !isEstimatedPosition && latitude !== null && longitude !== null;

  const handleCheckIn = async () => {
    if (!event || !id) return;
    if (!canCheckInPhysically) {
      setCheckError(
        'O check-in usa a tua posição real. Ativa o GPS e permite a localização neste site.',
      );
      return;
    }
    setChecking(true);
    setCheckError(null);
    setTrophy(null);
    try {
      const t = await checkIn({
        event_id: id,
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
      setChecking(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: event?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled or clipboard denied */
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-red-600"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{error ?? 'Evento não encontrado.'}</p>
      </div>
    );
  }

  const primaryButton =
    'w-full rounded-2xl bg-red-600 py-4 text-center font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60';
  const secondaryButton =
    'w-full rounded-2xl border border-gray-200 py-4 text-center font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600 disabled:opacity-60';

  // A ação depende do lugar da pessoa na fila. Um evento sem lotação nunca chega
  // ao ramo da lista de espera: `isFull` é sempre falso sem `capacity`.
  let rsvpAction: React.ReactNode = null;
  if (myStatus === 'admitted') {
    rsvpAction = (
      <p className="rounded-2xl border border-green-200 bg-green-50 py-4 text-center font-semibold text-green-800">
        Já entraste
      </p>
    );
  } else if (myStatus === 'confirmed' || myStatus === 'called') {
    rsvpAction = (
      <Link to={`/events/${id}/ticket`} className={primaryButton}>
        Ver o meu bilhete
      </Link>
    );
  } else if (myStatus === 'waitlisted') {
    rsvpAction = (
      <button
        type="button"
        onClick={() => void handleLeave()}
        disabled={rsvpBusy}
        className={secondaryButton}
      >
        Sair da lista
      </button>
    );
  } else {
    rsvpAction = (
      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={rsvpBusy}
        className={primaryButton}
      >
        {isFull ? 'Entrar na lista de espera' : 'Vou'}
      </button>
    );
  }

  return (
    <div className="pb-28">
      <div className="relative h-72 w-full sm:h-96">
        <img src={cover} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full bg-white/90 p-2.5 text-gray-800 shadow-md backdrop-blur transition hover:bg-white"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="rounded-full bg-white/90 p-2.5 text-gray-800 shadow-md backdrop-blur transition hover:bg-white"
              aria-label="Partilhar"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-full bg-white/90 p-2.5 text-gray-800 shadow-md backdrop-blur transition hover:bg-white"
              aria-label="Favorito"
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>
        {event.category && (
          <span className="absolute left-4 top-20 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-red-600 shadow">
            {event.category}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{event.title}</h1>
          <p className="mt-1 text-sm text-gray-200">{event.location_name ?? 'Local a definir'}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Preço</p>
            <p className="font-semibold text-gray-900">{priceText}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Data</p>
            <p className="font-semibold text-gray-900">{dateStr}</p>
            {timeStr && <p className="text-xs text-gray-500">{timeStr}</p>}
          </div>
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-1">
            <p className="text-xs text-gray-500">Rating</p>
            <p className="font-semibold text-gray-900">{formatRating(event.rating)}</p>
          </div>
        </div>

        {event.creator_id && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Organizador</p>
            <p className="font-medium text-gray-900">ID: {event.creator_id.slice(0, 8)}…</p>
          </div>
        )}

        {event.description && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-gray-900">Sobre</h2>
            <p className="whitespace-pre-wrap text-gray-600">{event.description}</p>
          </div>
        )}

        {isLimited && capacity && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="h-4 w-4" />
                {capacity.taken} de {capacity.capacity} vagas
              </p>
              {capacity.waitlist_count > 0 && (
                <p className="text-xs text-gray-500">
                  {capacity.waitlist_count} na lista de espera
                </p>
              )}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-red-600 transition-all"
                style={{
                  width: `${Math.min(100, (capacity.taken / (capacity.capacity || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {myStatus === 'called' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <p className="flex items-center gap-2 font-bold">
              <BellRing className="h-5 w-5" />
              É a tua vez!
            </p>
            <p className="mt-1 text-sm">
              Mostra o teu bilhete à entrada antes que o prazo acabe.
            </p>
          </div>
        )}

        {myStatus === 'waitlisted' && capacity?.my_waitlist_position != null && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            És o {capacity.my_waitlist_position}.º da lista de espera.
          </div>
        )}

        {myStatus === 'no_show' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            A tua chamada expirou. Podes voltar a entrar na fila.
          </div>
        )}

        {isCreator && id && (
          <Link
            to={`/events/${id}/attendees`}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-red-200"
          >
            <span className="font-medium text-gray-900">Gerir participantes</span>
            <QrCode className="h-5 w-5 text-red-600" />
          </Link>
        )}

        {rsvpError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            {rsvpError}
          </div>
        )}

        {checkError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            {checkError}
          </div>
        )}

        {trophy && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <strong>Troféu:</strong> {trophy.name}
            {trophy.description && <p className="mt-1 text-sm">{trophy.description}</p>}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto max-w-3xl space-y-2">
          {rsvpAction}
          <button
            type="button"
            onClick={() => void handleCheckIn()}
            disabled={checking}
            title={!canCheckInPhysically ? 'Ativa o GPS para fazer check-in' : undefined}
            className="w-full rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60"
          >
            {checking ? 'A confirmar…' : 'Check-in no evento'}
          </button>
        </div>
      </div>
    </div>
  );
}
