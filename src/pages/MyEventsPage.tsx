import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EventFeedCard } from '../components/ui/EventFeedCard.tsx';
import { getMyEvents } from '../services/flyerApi.ts';
import type { EventRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

export default function MyEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyEvents();
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-4 pb-28 sm:p-8 md:pb-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Os meus eventos</h1>
          <p className="mt-1 text-gray-500">Eventos que criaste no Flyer.</p>
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

      {!loading && !error && events.length === 0 && (
        <p className="py-12 text-center text-gray-500">
          Ainda não criaste eventos. Clica em &quot;Criar evento&quot; para começar.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {events.map((event) => (
          <EventFeedCard
            key={event.id}
            event={event}
            onOpen={() => navigate(`/events/${event.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
