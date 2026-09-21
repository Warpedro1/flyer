import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttendeeListRead, RsvpWithProfile } from '../types/index.ts';

import EventAttendeesPage from './EventAttendeesPage.tsx';

const getEventAttendees = vi.hoisted(() => vi.fn());
const callNextInWaitlist = vi.hoisted(() => vi.fn());
const recallAttendee = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({
  getEventAttendees,
  callNextInWaitlist,
  recallAttendee,
}));

function person(name: string, overrides: Partial<RsvpWithProfile> = {}): RsvpWithProfile {
  return {
    id: `rsvp-${name}`,
    event_id: 'evt-1',
    user_id: `user-${name}`,
    status: 'waitlisted',
    waitlist_position: 1,
    ahead_count: null,
    called_at: null,
    call_expires_at: null,
    admitted_at: null,
    created_at: null,
    profile: { id: `user-${name}`, name, email: null },
    ...overrides,
  };
}

function list(overrides: Partial<AttendeeListRead> = {}): AttendeeListRead {
  return {
    capacity: 2,
    taken: 2,
    confirmed: [],
    called: [],
    waitlist: [],
    no_show: [],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/evt-1/attendees']}>
      <Routes>
        <Route path="/events/:id/attendees" element={<EventAttendeesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EventAttendeesPage', () => {
  beforeEach(() => {
    getEventAttendees.mockReset();
    callNextInWaitlist.mockReset();
    recallAttendee.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra as vagas ocupadas de um evento com lotação', async () => {
    getEventAttendees.mockResolvedValue(
      list({ capacity: 50, taken: 32, confirmed: [person('Ana', { status: 'confirmed' })] }),
    );

    renderPage();

    expect(await screen.findByText(/32 de 50/i)).toBeInTheDocument();
  });

  it('diz "sem limite" quando o evento não tem lotação', async () => {
    getEventAttendees.mockResolvedValue(list({ capacity: null, taken: 12 }));

    renderPage();

    expect(await screen.findByText(/sem limite/i)).toBeInTheDocument();
  });

  it('chama o próximo da fila e recarrega a lista', async () => {
    const user = userEvent.setup();
    getEventAttendees
      .mockResolvedValueOnce(list({ waitlist: [person('Bea')] }))
      .mockResolvedValueOnce(
        list({ called: [person('Bea', { status: 'called', waitlist_position: null })] }),
      );
    callNextInWaitlist.mockResolvedValue(person('Bea', { status: 'called' }));

    renderPage();

    await user.click(await screen.findByRole('button', { name: /chamar o próximo/i }));

    await waitFor(() => expect(callNextInWaitlist).toHaveBeenCalledWith('evt-1'));
    expect(await screen.findByText(/chamado agora/i)).toBeInTheDocument();
  });

  it('desativa o botão quando não há ninguém na fila', async () => {
    getEventAttendees.mockResolvedValue(list({ waitlist: [] }));

    renderPage();

    expect(await screen.findByRole('button', { name: /chamar o próximo/i })).toBeDisabled();
  });

  it('rechama quem não apareceu', async () => {
    const user = userEvent.setup();
    getEventAttendees.mockResolvedValue(
      list({ no_show: [person('Caio', { status: 'no_show', waitlist_position: null })] }),
    );
    recallAttendee.mockResolvedValue(person('Caio', { status: 'called' }));

    renderPage();

    await user.click(await screen.findByRole('button', { name: /rechamar/i }));

    await waitFor(() =>
      expect(recallAttendee).toHaveBeenCalledWith('evt-1', 'rsvp-Caio'),
    );
  });

  it('refresca sozinha — é o polling que faz a fila andar no backend', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getEventAttendees.mockResolvedValue(list());

    renderPage();
    await waitFor(() => expect(getEventAttendees).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(15_000);

    await waitFor(() => expect(getEventAttendees).toHaveBeenCalledTimes(2));
  });

  it('para o polling ao sair do ecrã', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getEventAttendees.mockResolvedValue(list());

    const { unmount } = renderPage();
    await waitFor(() => expect(getEventAttendees).toHaveBeenCalledTimes(1));

    unmount();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(getEventAttendees).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro quando quem abre não é o criador', async () => {
    getEventAttendees.mockRejectedValue(new Error('Só o criador do evento pode fazer isto.'));

    renderPage();

    expect(await screen.findByText(/só o criador/i)).toBeInTheDocument();
  });
});
