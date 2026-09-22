import { ArrowLeft, CheckCircle2, Clock, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCountdown } from '../hooks/useCountdown.ts';
import { getMyRsvp, getRsvpQrToken } from '../services/flyerApi.ts';
import type { RsvpRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

/** O token vive ~45s no backend; renovar antes disso evita mostrar um QR morto. */
const REFRESH_MS = 30_000;

/** Estados em que ainda faz sentido mostrar um QR à porta. */
const SHOWS_QR: RsvpRead['status'][] = ['confirmed', 'called', 'waitlisted', 'no_show'];

export default function MyTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [rsvp, setRsvp] = useState<RsvpRead | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const refreshToken = useCallback(async () => {
    if (!id) return;
    try {
      const { token } = await getRsvpQrToken(id);
      const dataUrl = await QRCode.toDataURL(token, { width: 320, margin: 1 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [id]);

  // Renovação periódica. O cleanup não é decorativo: sem ele o intervalo continua
  // a bater na API depois de o utilizador sair do bilhete.
  useEffect(() => {
    const current = rsvp?.status;
    if (!id || !current || !SHOWS_QR.includes(current)) return;
    void refreshToken();
    const timer = setInterval(() => {
      void refreshToken();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [id, rsvp?.status, refreshToken]);

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
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-gray-600 transition hover:text-red-600"
      >
        <ArrowLeft className="h-5 w-5" />
        Voltar
      </button>

      {error && (
        <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}

      {!rsvp && !error && (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          Não estás inscrito neste evento.
        </p>
      )}

      {rsvp?.status === 'admitted' && (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
          <p className="mt-4 text-xl font-bold text-green-900">Já entraste</p>
          <p className="mt-1 text-sm text-green-800">Bom evento!</p>
        </div>
      )}

      {rsvp?.status === 'cancelled' && (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          Cancelaste a tua inscrição neste evento.
        </p>
      )}

      {rsvp && SHOWS_QR.includes(rsvp.status) && (
        <div className="space-y-4">
          {rsvp.status === 'called' && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-lg font-bold text-red-700">É a tua vez!</p>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm text-red-800">
                <Clock className="h-4 w-4" />
                Mostra este código dentro de{' '}
                <span className="font-mono font-bold">{countdown.label}</span>
              </p>
              {countdown.expired && (
                <p className="mt-2 text-sm text-red-800">
                  O prazo acabou. Fala com quem organiza para te chamar outra vez.
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
                  ? '1 pessoa à tua frente'
                  : `${rsvp.ahead_count ?? 0} pessoas à tua frente`}
              </p>
              <p className="mt-1 text-sm">
                Guarda este ecrã — avisamos-te quando for a tua vez.
              </p>
            </div>
          )}

          {rsvp.status === 'no_show' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-900">
              <p className="font-medium">A tua chamada expirou</p>
              <p className="mt-1 text-sm">
                Pede a quem organiza para te chamar de novo.
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
        </div>
      )}
    </div>
  );
}
