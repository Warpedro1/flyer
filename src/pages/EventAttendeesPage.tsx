import { ArrowLeft, BellRing, QrCode, UserCheck, UserX, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useCountdown } from '../hooks/useCountdown.ts';
import {
  callNextInWaitlist,
  getEventAttendees,
  recallAttendee,
} from '../services/flyerApi.ts';
import type { AttendeeListRead, RsvpWithProfile } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

/**
 * Recarrega a lista sozinha. Não é cosmético: cada leitura corre a varredura de
 * chamadas expiradas no backend, e é isso que faz a fila andar quando alguém que
 * foi chamado não aparece. Retirar este intervalo pára a fila.
 */
const POLL_MS = 15_000;

function CalledRow({ entry }: { entry: RsvpWithProfile }) {
  const countdown = useCountdown(entry.call_expires_at);
  return (
    <li className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
      <span className="font-medium text-red-900">{entry.profile.name ?? 'Sem nome'}</span>
      <span className="font-mono text-sm font-bold text-red-700">
        {countdown.expired ? 'prazo esgotado' : countdown.label}
      </span>
    </li>
  );
}

function PersonRow({
  entry,
  action,
}: {
  entry: RsvpWithProfile;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <span className="text-gray-900">
        {entry.waitlist_position !== null && (
          <span className="mr-2 font-mono text-xs text-gray-500">
            #{entry.waitlist_position}
          </span>
        )}
        {entry.profile.name ?? 'Sem nome'}
      </span>
      {action}
    </li>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500">
        {icon}
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

export default function EventAttendeesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AttendeeListRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const next = await getEventAttendees(id);
      setData(next);
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleCallNext = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await callNextInWaitlist(id);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRecall = async (rsvpId: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await recallAttendee(id, rsvpId);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  const queueEmpty = !data || data.waitlist.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 transition hover:text-red-600"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>
        {id && (
          <Link
            to={`/events/${id}/scan`}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <QrCode className="h-4 w-4" />
            Ler QR
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}

      {data && (
        <>
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-500">Ocupação</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.capacity === null ? 'Sem limite' : `${data.taken} de ${data.capacity}`}
            </p>
            {data.capacity !== null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-red-600 transition-all"
                  style={{
                    width: `${Math.min(100, (data.taken / data.capacity) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => void handleCallNext()}
              disabled={queueEmpty || busy}
              className="w-full rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-50 disabled:shadow-none"
            >
              Chamar o próximo
            </button>
            {queueEmpty && (
              <p className="mt-2 text-center text-sm text-gray-500">
                Não há ninguém na lista de espera.
              </p>
            )}
          </div>

          {data.called.length > 0 && (
            <Section title="Chamado agora" icon={<BellRing className="h-4 w-4" />}>
              {data.called.map((entry) => (
                <CalledRow key={entry.id} entry={entry} />
              ))}
            </Section>
          )}

          {data.waitlist.length > 0 && (
            <Section title="Na fila" icon={<Users className="h-4 w-4" />}>
              {data.waitlist.map((entry) => (
                <PersonRow key={entry.id} entry={entry} />
              ))}
            </Section>
          )}

          {data.confirmed.length > 0 && (
            <Section title="Confirmados" icon={<UserCheck className="h-4 w-4" />}>
              {data.confirmed.map((entry) => (
                <PersonRow key={entry.id} entry={entry} />
              ))}
            </Section>
          )}

          {data.no_show.length > 0 && (
            <Section title="Não apareceram" icon={<UserX className="h-4 w-4" />}>
              {data.no_show.map((entry) => (
                <PersonRow
                  key={entry.id}
                  entry={entry}
                  action={
                    <button
                      type="button"
                      onClick={() => void handleRecall(entry.id)}
                      disabled={busy}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                    >
                      Rechamar
                    </button>
                  }
                />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
