import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventCapacityRead, EventRead } from '../types/index.ts';

import EventDetailsPage from './EventDetailsPage.tsx';

const getEventById = vi.hoisted(() => vi.fn());
const checkIn = vi.hoisted(() => vi.fn());
const joinEvent = vi.hoisted(() => vi.fn());
const leaveEvent = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({
  getEventById,
  checkIn,
  joinEvent,
  leaveEvent,
}));
vi.mock('../hooks/useEffectiveGeo.ts', () => ({
  useEffectiveGeo: () => ({
    latitude: 38.7,
    longitude: -9.1,
    isEstimatedPosition: false,
  }),
}));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

function event(capacityState: EventCapacityRead | null, overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: 'evt-1',
    creator_id: 'someone-else',
    title: 'Jam session',
    description: null,
    category: null,
    location_name: 'Lisboa',
    lat: 38.7,
    long: -9.1,
    event_date: null,
    price: null,
    rating: null,
    attendee_count: 0,
    capacity: capacityState?.capacity ?? null,
    waitlist_enabled: true,
    call_ttl_minutes: 10,
    capacity_state: capacityState,
    is_boosted: false,
    boost_expires_at: null,
    created_at: null,
    media: [],
    ...overrides,
  };
}

function state(overrides: Partial<EventCapacityRead> = {}): EventCapacityRead {
  return {
    capacity: 50,
    taken: 12,
    waitlist_count: 0,
    my_status: null,
    my_waitlist_position: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/evt-1']}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EventDetailsPage — lotação e lista de espera', () => {
  beforeEach(() => {
    getEventById.mockReset();
    joinEvent.mockReset();
    leaveEvent.mockReset();
    checkIn.mockReset();
  });

  it('num evento sem limite não mostra vagas nem lista de espera', async () => {
    getEventById.mockResolvedValue(event(state({ capacity: null, taken: 9 })));

    renderPage();

    expect(await screen.findByRole('button', { name: /^vou$/i })).toBeInTheDocument();
    expect(screen.queryByText(/vagas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lista de espera/i)).not.toBeInTheDocument();
  });

  it('mostra as vagas ocupadas quando o evento tem lotação', async () => {
    getEventById.mockResolvedValue(event(state({ capacity: 50, taken: 12 })));

    renderPage();

    expect(await screen.findByText(/12 de 50 vagas/i)).toBeInTheDocument();
  });

  it('oferece a lista de espera quando a lotação está cheia', async () => {
    getEventById.mockResolvedValue(event(state({ capacity: 50, taken: 50 })));

    renderPage();

    expect(
      await screen.findByRole('button', { name: /entrar na lista de espera/i }),
    ).toBeInTheDocument();
  });

  it('mostra a posição de quem está na fila', async () => {
    getEventById.mockResolvedValue(
      event(state({ taken: 50, my_status: 'waitlisted', my_waitlist_position: 3 })),
    );

    renderPage();

    expect(await screen.findByText(/és o 3.º da lista/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sair da lista/i })).toBeInTheDocument();
  });

  it('avisa quem foi chamado', async () => {
    getEventById.mockResolvedValue(event(state({ my_status: 'called' })));

    renderPage();

    expect(await screen.findByText(/é a tua vez/i)).toBeInTheDocument();
  });

  it('leva quem tem vaga ao bilhete', async () => {
    getEventById.mockResolvedValue(event(state({ my_status: 'confirmed' })));

    renderPage();

    const link = await screen.findByRole('link', { name: /ver o meu bilhete/i });
    expect(link).toHaveAttribute('href', '/events/evt-1/ticket');
  });

  it('deixa quem não apareceu voltar para a fila', async () => {
    getEventById.mockResolvedValue(event(state({ taken: 50, my_status: 'no_show' })));

    renderPage();

    expect(await screen.findByText(/a tua chamada expirou/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entrar na lista de espera/i }),
    ).toBeInTheDocument();
  });

  it('só mostra a gestão de participantes ao criador', async () => {
    getEventById.mockResolvedValue(
      event(state(), { creator_id: 'user-1' }),
    );

    renderPage();

    const link = await screen.findByRole('link', { name: /gerir participantes/i });
    expect(link).toHaveAttribute('href', '/events/evt-1/attendees');
  });

  it('não mostra a gestão de participantes a quem não criou o evento', async () => {
    getEventById.mockResolvedValue(event(state()));

    renderPage();

    await screen.findByRole('button', { name: /^vou$/i });
    expect(screen.queryByRole('link', { name: /gerir participantes/i })).toBeNull();
  });

  it('confirma presença e recarrega o estado do evento', async () => {
    const user = userEvent.setup();
    getEventById
      .mockResolvedValueOnce(event(state()))
      .mockResolvedValueOnce(event(state({ taken: 13, my_status: 'confirmed' })));
    joinEvent.mockResolvedValue({ status: 'confirmed' });

    renderPage();

    await user.click(await screen.findByRole('button', { name: /^vou$/i }));

    await waitFor(() => expect(joinEvent).toHaveBeenCalledWith('evt-1'));
    expect(await screen.findByRole('link', { name: /ver o meu bilhete/i })).toBeInTheDocument();
  });

  it('mostra o erro quando o evento esgota entre o ecrã e o clique', async () => {
    const user = userEvent.setup();
    getEventById.mockResolvedValue(event(state({ capacity: 1, taken: 0 })));
    joinEvent.mockRejectedValue(new Error('Evento esgotado.'));

    renderPage();

    await user.click(await screen.findByRole('button', { name: /^vou$/i }));

    expect(await screen.findByText(/evento esgotado/i)).toBeInTheDocument();
  });
});
