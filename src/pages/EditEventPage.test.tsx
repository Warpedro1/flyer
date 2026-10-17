import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventEditRead } from '../types/index.ts';

import EditEventPage from './EditEventPage.tsx';

const getEventForEdit = vi.hoisted(() => vi.fn());
const updateEvent = vi.hoisted(() => vi.fn());
const getEventById = vi.hoisted(() => vi.fn());
const discoverEvents = vi.hoisted(() => vi.fn());
const uploadEventMedia = vi.hoisted(() => vi.fn());
const uploadTrophyIcon = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ getEventForEdit, updateEvent, getEventById, discoverEvents }));
vi.mock('../lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('../services/storage.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/storage.ts')>()),
  uploadEventMedia,
  uploadTrophyIcon,
}));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, session: null, loading: false, signInWithGoogle: vi.fn(), signOut: vi.fn() }),
}));
vi.mock('../hooks/useEffectiveGeo.ts', () => ({
  useEffectiveGeo: () => ({ effectiveLat: -8.06, effectiveLng: -34.87 }),
}));

const STORED: EventEditRead = {
  id: 'evt-1',
  title: 'Aula de frevo',
  description: 'Para iniciantes',
  category: 'musica_show',
  place_id: null,
  location_name: 'Paço do Frevo, Recife',
  lat: -8.06,
  long: -34.87,
  // UTC, como o backend devolve: 20:00 e 23:00 em Recife.
  event_date: '2026-10-16T23:00:00+00:00',
  ends_at: '2026-10-17T02:00:00+00:00',
  checkin_opens_at: '2026-10-16T22:30:00+00:00',
  price: '20.00',
  capacity: 30,
  waitlist_enabled: true,
  call_ttl_minutes: 10,
  auto_call_next: true,
  media: [{ media_url: 'user-1/foto.jpg', type: 'image', order_index: 0, preview_url: 'https://signed/foto' }],
  trophy: {
    name: 'Passista',
    description: 'Dançaste frevo',
    icon_url: 'user-1/trofeu.png',
    icon_preview_url: 'https://signed/trofeu',
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/evt-1/edit']}>
      <Routes>
        <Route path="/events/:id/edit" element={<EditEventPage />} />
        <Route path="/events/:id" element={<p>Página do evento</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EditEventPage', () => {
  beforeEach(() => {
    getEventForEdit.mockReset().mockResolvedValue(STORED);
    updateEvent.mockReset().mockResolvedValue({ id: 'evt-1' });
    getEventById.mockReset();
  });

  it('abre o formulário com os valores guardados, em hora de Recife', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('Aula de frevo')).toBeInTheDocument();
    expect(screen.getByLabelText(/início do evento/i)).toHaveValue('2026-10-16T20:00');
    expect(screen.getByLabelText(/fim do evento/i)).toHaveValue('2026-10-16T23:00');
    expect(screen.getByLabelText(/abrir check-in/i)).toHaveValue('2026-10-16T19:30');
    expect(screen.getByLabelText(/nome do troféu/i)).toHaveValue('Passista');
    expect(screen.getByRole('img', { name: /pré-visualização do ícone/i })).toHaveAttribute(
      'src',
      'https://signed/trofeu',
    );
    expect(screen.getByText('foto.jpg')).toBeInTheDocument();
  });

  it('não deixa mudar a recorrência', async () => {
    renderPage();
    await screen.findByDisplayValue('Aula de frevo');

    expect(screen.queryByText(/recorrência/i)).toBeNull();
  });

  it('grava as alterações sem voltar a geocodificar e volta ao evento', async () => {
    const user = userEvent.setup();

    renderPage();
    const title = await screen.findByDisplayValue('Aula de frevo');
    await user.clear(title);
    await user.type(title, 'Aula de frevo avançada');
    fireEvent.change(screen.getByLabelText(/fim do evento/i), { target: { value: '2026-10-16T23:30' } });
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(updateEvent).toHaveBeenCalledTimes(1));
    const [eventId, payload] = updateEvent.mock.calls[0];
    expect(eventId).toBe('evt-1');
    expect(payload).toMatchObject({
      title: 'Aula de frevo avançada',
      location_name: 'Paço do Frevo, Recife',
      lat: -8.06,
      long: -34.87,
      event_date: '2026-10-16T20:00',
      ends_at: '2026-10-16T23:30',
      checkin_opens_at: '2026-10-16T19:30',
      price: '20.00',
      capacity: 30,
      media: [{ media_url: 'user-1/foto.jpg', type: 'image', order_index: 0 }],
      trophy: { name: 'Passista', description: 'Dançaste frevo', icon_url: 'user-1/trofeu.png' },
    });
    expect(payload).not.toHaveProperty('recurrence');
    expect(await screen.findByText('Página do evento')).toBeInTheDocument();
  });

  it('o nome padrão do troféu não fica preso ao título antigo', async () => {
    getEventForEdit.mockResolvedValue({
      ...STORED,
      trophy: { name: 'Presença: Aula de frevo', description: null, icon_url: null, icon_preview_url: null },
    });

    renderPage();
    await screen.findByDisplayValue('Aula de frevo');

    expect(screen.getByLabelText(/nome do troféu/i)).toHaveValue('');
  });

  it('mostra o erro de quem não pode editar', async () => {
    getEventForEdit.mockRejectedValue(new Error('Só o criador do evento pode fazer isto.'));

    renderPage();

    expect(await screen.findByText(/só o criador/i)).toBeInTheDocument();
  });
});
