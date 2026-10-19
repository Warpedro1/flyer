import axios from 'axios';
import { BellRing, Clock, ExternalLink, Heart, MapPin, Pencil, QrCode, Share2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { BackButton } from '../components/navigation/BackButton.tsx';
import { TrophyIcon } from '../components/ui/TrophyIcon.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import {
  checkIn,
  closeCheckin,
  getEventById,
  getPlaceEvents,
  joinEvent,
  leaveEvent,
  openCheckin,
} from '../services/flyerApi.ts';
import type { EventRead, TrophyRead } from '../types/index.ts';
import { formatApiError, isNotFoundError } from '../utils/apiError.ts';
import { NotFoundContent } from '../components/errors/NotFound.tsx';
import { categoryLabel } from '../utils/categories.ts';
import { checkinAllowed, checkinStatusText } from '../utils/checkinLabel.ts';
import { formatRecifeTime } from '../utils/recifeTime.ts';
import {
  eventPriceText,
  formatEventDate,
  formatRating,
  pickCoverImage,
  PLACEHOLDER_IMAGE,
  showPlaceholder,
} from '../utils/eventFormatters.ts';

/** Rótulo do link para a página do item na fonte. */
function sourceLinkLabel(url: string): string {
  if (url.includes('sympla.com')) return 'Ver na Sympla';
  if (url.includes('google.')) return 'Ver no Google Maps';
  return 'Ver na fonte';
}

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const {
    latitude,
    longitude,
    isEstimatedPosition,
  } = useEffectiveGeo();

  const [event, setEvent] = useState<EventRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [trophy, setTrophy] = useState<TrophyRead | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [windowBusy, setWindowBusy] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [placeEvents, setPlaceEvents] = useState<EventRead[]>([]);
  const { user } = useAuth();
  const isPlace = event?.kind === 'place';

  // Um lugar mostra os próximos eventos que acontecem lá.
  useEffect(() => {
    if (!id || !isPlace) {
      setPlaceEvents([]);
      return;
    }
    let cancelled = false;
    getPlaceEvents(id)
      .then((rows) => {
        if (!cancelled) setPlaceEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setPlaceEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isPlace]);

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
      setNotFound(false);
      try {
        const data = await getEventById(id);
        if (!cancelled) setEvent(data);
      } catch (err) {
        if (cancelled) return;
        if (isNotFoundError(err)) setNotFound(true);
        else setError(formatApiError(err));
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
  const priceText = event ? eventPriceText(event) || '—' : '—';
  const { date: dateStr, time: timeStr } = event
    ? formatEventDate(event.event_date)
    : { date: '—', time: '' };

  const canCheckInPhysically =
    !isEstimatedPosition && latitude !== null && longitude !== null;

  const handleCheckIn = async () => {
    if (!event || !id) return;
    if (!canCheckInPhysically) {
      setCheckError(
        'O check-in usa sua posição real. Ative o GPS e permita a localização neste site.',
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
        setCheckError('Você já ganhou o troféu deste evento.');
      } else {
        setCheckError(formatApiError(err));
      }
    } finally {
      setChecking(false);
    }
  };

  // O dono abre o check-in antes da hora programada, ou fecha-o antes do fim.
  const handleCheckinWindow = async (action: 'open' | 'close') => {
    if (!id) return;
    setWindowBusy(true);
    setCheckError(null);
    try {
      await (action === 'open' ? openCheckin(id) : closeCheckin(id));
      await reload();
    } catch (err) {
      setCheckError(formatApiError(err));
    } finally {
      setWindowBusy(false);
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

  if (notFound) {
    return (
      <div className="p-6">
        <NotFoundContent
          title="Não encontramos este evento"
          message="Pode ter sido apagado, ou o link está errado."
        />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6">
        <BackButton className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-red-600" />
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{error ?? 'Evento não encontrado.'}</p>
      </div>
    );
  }

  // Decisões 2026-10-17: eventos do app fazem check-in pelo QR na entrada; lugares por
  // GPS; eventos importados são só informativos ("Tenho interesse", sem ingresso).
  const method = event.checkin_method;
  const statusText = method === 'none' ? null : checkinStatusText(event);

  // `block`: o bilhete é um <Link> (um <a>, inline), e sem isto o w-full e o py-4
  // não ocupam espaço.
  const primaryButton =
    'block w-full rounded-2xl bg-red-600 py-4 text-center font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60';
  const secondaryButton =
    'block w-full rounded-2xl border border-gray-200 py-4 text-center font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600 disabled:opacity-60';

  // A ação depende do lugar da pessoa na fila. Um evento sem lotação nunca chega
  // ao ramo da lista de espera: `isFull` é sempre falso sem `capacity`.
  let rsvpAction: React.ReactNode = null;
  if (isCreator && id) {
    // Quem organiza não confirma presença no próprio evento: gerencia quem vai.
    rsvpAction = (
      <Link
        to={`/events/${id}/attendees`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700"
      >
        <QrCode className="h-5 w-5" />
        Gerenciar participantes
      </Link>
    );
  } else if (method === 'none') {
    rsvpAction =
      myStatus === 'confirmed' ? (
        <button
          type="button"
          onClick={() => void handleLeave()}
          disabled={rsvpBusy}
          className={secondaryButton}
        >
          Você tem interesse
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleJoin()}
          disabled={rsvpBusy}
          className={primaryButton}
        >
          Tenho interesse
        </button>
      );
  } else if (myStatus === 'admitted') {
    rsvpAction = (
      <p className="rounded-2xl border border-green-200 bg-green-50 py-4 text-center font-semibold text-green-800">
        Você já entrou
      </p>
    );
  } else if (myStatus === 'confirmed' || myStatus === 'called') {
    rsvpAction = (
      <Link to={`/events/${id}/ticket`} className={primaryButton}>
        Ver meu ingresso
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
    <div className="flex min-h-full flex-col md:block md:pb-6">
      {/* Barra fixa no topo: o Voltar não desaparece com o scroll (estas páginas não têm
          a barra de navegação de baixo). Fica por cima da capa, com altura zero. */}
      <div
        data-testid="event-topbar"
        className="sticky top-0 z-30 h-0 overflow-visible"
      >
        <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <BackButton />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="rounded-full bg-white/90 p-2.5 text-gray-800 shadow-md backdrop-blur transition hover:bg-white"
              aria-label="Compartilhar"
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
      </div>
      <div className="relative h-72 w-full sm:h-96">
        <img
          referrerPolicy="no-referrer"
          src={cover}
          alt=""
          onError={showPlaceholder}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
        <div className="absolute left-4 top-20 flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-900/80 px-3 py-1 text-xs font-bold text-white shadow">
            {isPlace ? 'Lugar' : 'Evento'}
          </span>
          {event.category && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-red-600 shadow">
              {categoryLabel(event.category)}
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{event.title}</h1>
          <p className="mt-1 text-sm text-gray-200">{event.location_name ?? 'Local a definir'}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
        {/* Só quem criou recebe um evento oculto pela moderação (flyer-back#22 A). */}
        {isCreator && event.moderation_blocked && id && (
          <div
            data-testid="moderation-hidden"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
          >
            <p className="font-semibold">Este evento está oculto</p>
            <p className="mt-1 text-sm">
              A moderação recusou parte do conteúdo (texto, local, troféu ou fotos), e ninguém mais
              vê este evento. Edite para corrigir: ao salvar, ele volta a aparecer.
            </p>
            <Link
              to={`/events/${id}/edit`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar evento
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Preço</p>
            <p className="font-semibold text-gray-900">{priceText}</p>
          </div>
          {!isPlace && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Data</p>
              <p className="font-semibold text-gray-900">{dateStr}</p>
              {timeStr && (
                <p className="text-xs text-gray-500">
                  {timeStr}
                  {event.ends_at && ` – ${formatRecifeTime(event.ends_at)}`}
                </p>
              )}
            </div>
          )}
          <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-1">
            <p className="text-xs text-gray-500">Rating</p>
            <p className="font-semibold text-gray-900">{formatRating(event.rating)}</p>
          </div>
        </div>

        {event.place_id && (
          <Link
            to={`/events/${event.place_id}`}
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-red-200"
          >
            <span className="flex items-center gap-2 font-medium text-gray-900">
              <MapPin className="h-5 w-5 text-red-600" />
              Ver o lugar
            </span>
          </Link>
        )}

        {isPlace && event.opening_hours && event.opening_hours.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <Clock className="h-4 w-4 text-red-600" />
              Horários
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {event.opening_hours.map((h) => (
                <div key={h.day} className="contents">
                  <dt className="text-gray-500 first-letter:uppercase">{h.day}</dt>
                  <dd className="text-gray-900">{h.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {isPlace && placeEvents.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-gray-900">Próximos eventos aqui</h2>
            <ul className="space-y-2">
              {placeEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/events/${e.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-red-50"
                  >
                    <span className="font-medium text-gray-900">{e.title}</span>
                    <span className="text-sm text-gray-500">{formatEventDate(e.event_date).date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {event.source_url && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-red-200"
          >
            <span className="font-medium text-gray-900">{sourceLinkLabel(event.source_url)}</span>
            <ExternalLink className="h-5 w-5 text-red-600" />
          </a>
        )}

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
              É a sua vez!
            </p>
            <p className="mt-1 text-sm">
              Mostre seu ingresso na entrada antes que o prazo acabe.
            </p>
          </div>
        )}

        {myStatus === 'waitlisted' && capacity?.my_waitlist_position != null && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            Você é o {capacity.my_waitlist_position}º da lista de espera.
          </div>
        )}

        {myStatus === 'no_show' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            Sua chamada expirou. Você pode entrar na fila de novo.
          </div>
        )}

        {isCreator && id && !isPlace && (
          <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Organização</p>
            {/* Importados vêm de uma fonte: uma nova importação desfazia a edição. */}
            {!event.source_url && (
              <Link
                to={`/events/${id}/edit`}
                className="flex items-center justify-between rounded-xl px-1 py-2 font-medium text-gray-900 transition hover:text-red-600"
              >
                Editar evento
                <Pencil className="h-5 w-5 text-red-600" />
              </Link>
            )}
            {event.checkin_status === 'open' ? (
              <button
                type="button"
                onClick={() => void handleCheckinWindow('close')}
                disabled={windowBusy}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-red-300 hover:text-red-600 disabled:opacity-60"
              >
                Fechar check-in
              </button>
            ) : (
              event.checkin_status !== 'no_schedule' && (
                <button
                  type="button"
                  onClick={() => void handleCheckinWindow('open')}
                  disabled={windowBusy}
                  className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Abrir check-in agora
                </button>
              )
            )}
          </div>
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
          <div className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <TrophyIcon iconUrl={trophy.icon_url} name={trophy.name} className="h-14 w-14 shrink-0" />
            <div className="min-w-0">
              <strong>Troféu:</strong> {trophy.name}
              {trophy.description && <p className="mt-1 text-sm">{trophy.description}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Sticky e não fixed: no fim do scroll a barra ocupa o seu espaço e não tapa o conteúdo. */}
      <div
        data-testid="event-actions"
        className="sticky bottom-0 z-[100] mt-auto border-t border-gray-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
      >
        <div className="mx-auto max-w-3xl space-y-2 md:px-4">
          {/* Lugares não têm inscrição nem bilhete; o check-in mantém-se. */}
          {!isPlace && rsvpAction}
          {statusText && (
            <p className="text-center text-sm text-gray-600" data-testid="checkin-status">
              {statusText}
            </p>
          )}
          {method === 'qr' && !isCreator && myStatus !== 'admitted' && (
            <p className="text-center text-sm text-gray-600">
              O check-in é feito na entrada: mostre seu ingresso.
            </p>
          )}
          {method === 'gps' && (
            <button
              type="button"
              onClick={() => void handleCheckIn()}
              disabled={checking || !checkinAllowed(event)}
              title={!canCheckInPhysically ? 'Ative o GPS para fazer check-in' : undefined}
              className="w-full rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60"
            >
              {checking ? 'Confirmando…' : 'Check-in no lugar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
