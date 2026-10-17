import { useNavigate } from 'react-router-dom';

import { EventForm } from '../components/events/EventForm.tsx';
import { createEvent } from '../services/flyerApi.ts';
import type { EventCreate } from '../types/index.ts';

export default function CreateEventPage() {
  const navigate = useNavigate();

  const handleSubmit = async (payload: EventCreate) => {
    await createEvent(payload);
    setTimeout(() => void navigate('/events'), 1200);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:pb-8">
      <h1 className="text-2xl font-bold text-gray-900">Criar evento</h1>
      <p className="mt-1 text-sm text-gray-500">Preencha os dados e publique um novo evento.</p>
      <EventForm
        mode="create"
        submitLabel="Criar evento"
        submittingLabel="Criando…"
        successMessage="Evento criado com sucesso! Redirecionando..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
