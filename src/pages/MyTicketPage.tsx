import { CheckCircle2, Clock, MapPin, MapPinOff, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.ts';
import { useCountdown } from '../hooks/useCountdown.ts';
import { useUserChannel } from '../hooks/useUserChannel.ts';
import { getMyRsvp, getRsvpQrToken } from '../services/flyerApi.ts';
import type { CheckinDoneNotice, RsvpQrRequest, RsvpRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import { BackButton } from '../components/navigation/BackButton.tsx';
import { TrophyIcon } from '../components/ui/TrophyIcon.tsx';

/** O token vive ~45s no backend; renovar antes disso evita mostrar um QR morto. */
const REFRESH_MS = 30_000;
/** Reserva do tempo real: a inscrição é consultada assim enquanto a tela está aberta. */
const POLL_MS = 5_000;

type GpsState = 'waiting' | 'on' | 'denied' | 'unavailable';

/** Estados em que ainda faz sentido mostrar um QR à porta. */
const SHOWS_QR: RsvpRead['status'][] = ['confirmed', 'called', 'waitlisted', 'no_show'];

export default function MyTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [rsvp, setRsvp] = useState<RsvpRead | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // O aviso do leitor na entrada (Pusher), com o troféu.
  const [notice, setNotice] = useState<CheckinDoneNotice | null>(null);
  const [gps, setGps] = useState<GpsState>('waiting');
  const [gotFix, setGotFix] = useState(false);
  // A posição mais recente vai em cada QR novo (decisões 2026-10-17).
  const positionRef = useRef<RsvpQrRequest>({});

  const done = notice !== null || rsvp?.status === 'admitted';

  // Guarda o estado atual para o intervalo não ficar preso ao valor do primeiro render.
  const statusRef = useRef<RsvpRead['status'] | null>(null);
  statusRef.current = rsvp?.status ?? null;

  const countdown = useCountdown(
    rsvp?.status === 'called' ? rsvp.call_expires_at : null,
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyRsvp(id);
        if (!cancelled) setRsvp(data);
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

  // Reserva do tempo real: também mostra quando chega a vez de quem está na fila.
  useEffect(() => {
    if (!id || done || !rsvp || rsvp.status === 'cancelled') return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void getMyRsvp(id)
        .then((data) => {
          if (data) setRsvp(data);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [id, done, rsvp]);

  const handlers = useMemo(
    () => ({
      'checkin:done': (data: unknown) => {
        const received = data as CheckinDoneNotice | null;
        if (!received || received.event_id !== id) return;
        setNotice(received);
        try {
          navigator.vibrate?.([80, 60, 80]);
        } catch {
          /* sem vibração */
        }
      },
    }),
    [id],
  );
  useUserChannel(done ? null : (user?.id ?? null), handlers);

  // GPS enquanto o QR está na tela; o cleanup desliga o GPS ao sair.
  useEffect(() => {
    if (done) return;
    const geo = navigator.geolocation;
    if (!geo?.watchPosition) {
      setGps('unavailable');
      return;
    }
    const watchId = geo.watchPosition(
      (position) => {
        positionRef.current = {
          lat: position.coords.latitude,
          long: position.coords.longitude,
          accuracy: position.coords.accuracy,
          fix_at: new Date(position.timestamp).toISOString(),
        };
        setGps('on');
        setGotFix(true);
      },
      (err) => setGps(err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
    return () => geo.clearWatch(watchId);
  }, [done]);

  const refreshToken = useCallback(async () => {
    if (!id) return;
    try {
      const { token } = await getRsvpQrToken(id, positionRef.current);
      const dataUrl = await QRCode.toDataURL(token, { width: 320, margin: 1 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [id]);

  // Renovação periódica. O cleanup não é decorativo: sem ele o intervalo continua
  // a bater na API depois de o utilizador sair do bilhete.
  // Com a primeira posição (`gotFix`), o QR é refeito na hora para já levá-la.
  useEffect(() => {
    const current = rsvp?.status;
    if (!id || done || !current || !SHOWS_QR.includes(current)) return;
    void refreshToken();
    const timer = setInterval(() => {
      void refreshToken();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [id, done, rsvp?.status, refreshToken, gotFix]);

  // Mantém o ecrã aceso enquanto o QR está à vista; sem a API, não faz nada.
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let released = false;
    void navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (released) {
          void lock.release();
          return;
        }
        sentinel = lock;
      })
      .catch(() => {
        /* negado ou sem suporte: o bilhete funciona na mesma */
      });
    return () => {
      released = true;
      void sentinel?.release().catch(() => undefined);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <BackButton className="mb-4 inline-flex items-center gap-2 text-gray-600 transition hover:text-red-600" />

      {error && (
        <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}

      {!rsvp && !error && (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          Você não está inscrito neste evento.
        </p>
      )}

      {done && (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
          <p className="mt-4 text-2xl font-bold text-green-900">Check-in feito!</p>
          {notice?.trophy && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <TrophyIcon iconUrl={notice.trophy.icon_url} name={notice.trophy.name} className="h-16 w-16" />
              <p className="font-semibold text-green-900">{notice.trophy.name}</p>
              <p className="text-xs text-green-800">Você ganhou este troféu.</p>
            </div>
          )}
          <p className="mt-3 text-sm text-green-800">Bom evento!</p>
        </div>
      )}

      {rsvp?.status === 'cancelled' && (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          Você cancelou sua inscrição neste evento.
        </p>
      )}

      {rsvp && !done && SHOWS_QR.includes(rsvp.status) && (
        <div className="space-y-4">
          {rsvp.status === 'called' && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-lg font-bold text-red-700">É a sua vez!</p>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm text-red-800">
                <Clock className="h-4 w-4" />
                Mostre este código em até{' '}
                <span className="font-mono font-bold">{countdown.label}</span>
              </p>
              {countdown.expired && (
                <p className="mt-2 text-sm text-red-800">
                  O prazo acabou. Fale com a organização para chamarem você de novo.
                </p>
              )}
            </div>
          )}

          {rsvp.status === 'confirmed' && (
            <p className="rounded-2xl border border-gray-100 bg-white p-4 text-center font-medium text-gray-900 shadow-sm">
              Vaga confirmada
            </p>
          )}

          {rsvp.status === 'waitlisted' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-900">
              <p className="flex items-center justify-center gap-2 font-medium">
                <Users className="h-4 w-4" />
                {rsvp.ahead_count === 1
                  ? '1 pessoa na sua frente'
                  : `${rsvp.ahead_count ?? 0} pessoas na sua frente`}
              </p>
              <p className="mt-1 text-sm">
                Deixe esta tela aberta: avisamos quando for a sua vez.
              </p>
            </div>
          )}

          {rsvp.status === 'no_show' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-900">
              <p className="font-medium">Sua chamada expirou</p>
              <p className="mt-1 text-sm">
                Peça à organização para chamar você de novo.
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Código QR de entrada"
                className="mx-auto h-64 w-64"
              />
            ) : (
              <div className="mx-auto flex h-64 w-64 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              </div>
            )}
            <p className="mt-4 text-xs text-gray-500">
              O código muda sozinho a cada 30 segundos. Não vale tirar print.
            </p>
          </div>

          {gps === 'on' && (
            <p className="flex items-center justify-center gap-2 text-xs text-green-700">
              <MapPin className="h-4 w-4" />
              Localização ativa: o check-in confere se você está no local.
            </p>
          )}
          {(gps === 'denied' || gps === 'unavailable') && (
            <p className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <MapPinOff className="h-4 w-4 shrink-0" />
              Ative a localização: o check-in confere se você está no local.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
