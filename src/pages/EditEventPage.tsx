import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EventForm, type EventFormInitial } from '../components/events/EventForm.tsx';
import { BackButton } from '../components/navigation/BackButton.tsx';
import { getEventById, getEventForEdit, updateEvent } from '../services/flyerApi.ts';
import type { EventCreate, EventUpdate } from '../types/index.ts';
import { formatApiError, isNotFoundError } from '../utils/apiError.ts';
import { NotFoundContent } from '../components/errors/NotFound.tsx';

/** Editar uma data de um evento (só o criador; a recorrência não muda). */
export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<EventFormInitial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const event = await getEventForEdit(id);
        // O seletor de lugar precisa do lugar inteiro, não só do id.
        const place = event.place_id ? await getEventById(event.place_id).catch(() => null) : null;
        if (!cancelled) setInitial({ event, place });
      } catch (err) {
        if (cancelled) return;
        if (isNotFoundError(err)) setNotFound(true);
        else setError(formatApiError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (payload: EventCreate) => {
    if (!id) return;
    // O formulário em modo editar não manda recorrência; `EventUpdate` nem a aceita.
    const update: EventUpdate = payload;
    await updateEvent(id, update);
    void navigate(`/events/${id}`, { replace: true });
  };

  if (notFound) {
    return (
      <div className="p-6">
        <NotFoundContent title="Não encontrámos este evento" message="Pode ter sido apagado, ou o link está errado." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:pb-8">
      <BackButton className="mb-4 inline-flex items-center gap-2 text-gray-600 hover:text-red-600" />
      <h1 className="text-2xl font-bold text-gray-900">Editar evento</h1>
      <p className="mt-1 text-sm text-gray-500">
        As alterações valem só para esta data do evento.
      </p>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          {error}
        </p>
      )}
      {!error && !initial && (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      )}
      {initial && (
        <EventForm
          mode="edit"
          initial={initial}
          submitLabel="Guardar alterações"
          submittingLabel="A guardar…"
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
