import { Plus, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EventFeedCard } from '../components/ui/EventFeedCard.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { getMyEvents } from '../services/flyerApi.ts';
import type { EventRead, MyEventsRole, MyEventsWhen } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

const PAGE_SIZE = 20;

const ROLES: { value: MyEventsRole; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'going', label: 'Vou' },
  { value: 'created', label: 'Criei' },
];

const WHENS: { value: MyEventsWhen; label: string }[] = [
  { value: 'upcoming', label: 'Próximos' },
  { value: 'past', label: 'Passados' },
];

/** Selo com o seu estado no evento: a sua inscrição ou "Criado por você". */
function statusLabel(event: EventRead, userId: string | undefined): string | null {
  const rsvp = event.my_rsvp;
  if (rsvp?.status === 'confirmed') return 'Confirmado';
  if (rsvp?.status === 'waitlisted') {
    return rsvp.waitlist_position != null ? `Na fila (${rsvp.waitlist_position}º)` : 'Na fila';
  }
  if (rsvp?.status === 'called') return 'Sua vez!';
  if (rsvp?.status === 'admitted') return 'Entrou';
  if (userId && event.creator_id === userId) return 'Criado por você';
  return null;
}

function hasTicket(event: EventRead): boolean {
  return event.my_rsvp?.status === 'confirmed' || event.my_rsvp?.status === 'called';
}

function Pill({ selected, label, onSelect }: { selected: boolean; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        selected ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ role, when }: { role: MyEventsRole; when: MyEventsWhen }) {
  if (when === 'past') return <p className="py-12 text-center text-gray-500">Nenhum evento passado.</p>;
  if (role === 'going') {
    return (
      <div className="py-12 text-center text-gray-500">
        Você ainda não vai a nenhum evento. Explore em{' '}
        <Link to="/" className="font-semibold text-red-600 hover:underline">
          Descobrir
        </Link>
        .
      </div>
    );
  }
  if (role === 'created') {
    return (
      <p className="py-12 text-center text-gray-500">
        Você ainda não criou eventos. Clique em &quot;Criar evento&quot; para começar.
      </p>
    );
  }
  return (
    <p className="py-12 text-center text-gray-500">
      Você ainda não criou nem se inscreveu em eventos. Explore em Descobrir ou crie o seu.
    </p>
  );
}

/** "Meus eventos" (Warpedro1/flyer-back#40): o que você criou e aquilo em que vai. */
export default function MyEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState<MyEventsRole>('all');
  const [when, setWhen] = useState<MyEventsWhen>('upcoming');
  const [events, setEvents] = useState<EventRead[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents([]);
    (async () => {
      try {
        const data = await getMyEvents({ role, when, limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        setEvents(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, when]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await getMyEvents({ role, when, limit: PAGE_SIZE, offset: events.length });
      setEvents((prev) => [...prev, ...data.filter((e) => !prev.some((p) => p.id === e.id))]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 pb-28 sm:p-8 md:pb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus eventos</h1>
          <p className="mt-1 text-gray-500">Eventos que você criou ou em que vai.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/events/new')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-red-200 transition hover:bg-red-700"
        >
          <Plus className="h-5 w-5" />
          Criar evento
        </button>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Quais eventos" className="flex gap-2 rounded-3xl bg-gray-50 p-1">
          {ROLES.map((r) => (
            <Pill key={r.value} label={r.label} selected={role === r.value} onSelect={() => setRole(r.value)} />
          ))}
        </div>
        <div role="tablist" aria-label="Quando" className="flex gap-2 rounded-3xl bg-gray-50 p-1">
          {WHENS.map((w) => (
            <Pill key={w.value} label={w.label} selected={when === w.value} onSelect={() => setWhen(w.value)} />
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && <EmptyState role={role} when={when} />}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {events.map((event) => {
          const label = statusLabel(event, user?.id);
          return (
            <EventFeedCard
              key={event.id}
              event={event}
              onOpen={() => navigate(`/events/${event.id}`)}
              footer={
                label || hasTicket(event) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {label && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          event.my_rsvp?.status === 'called' ? 'bg-amber-400 text-gray-900' : 'bg-white/95 text-gray-900'
                        }`}
                      >
                        {label}
                      </span>
                    )}
                    {hasTicket(event) && (
                      <button
                        type="button"
                        onClick={() => navigate(`/events/${event.id}/ticket`)}
                        className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        Ver ingresso
                      </button>
                    )}
                  </div>
                ) : undefined
              }
            />
          );
        })}
      </div>

      {hasMore && !loading && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="rounded-2xl border border-gray-200 bg-white px-6 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  );
}
