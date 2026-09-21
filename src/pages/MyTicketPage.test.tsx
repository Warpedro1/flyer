import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RsvpRead } from '../types/index.ts';

import MyTicketPage from './MyTicketPage.tsx';

const getMyRsvp = vi.hoisted(() => vi.fn());
const getRsvpQrToken = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ getMyRsvp, getRsvpQrToken }));
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR') },
}));

function rsvp(overrides: Partial<RsvpRead> = {}): RsvpRead {
  return {
    id: 'rsvp-1',
    event_id: 'evt-1',
    user_id: 'user-1',
    status: 'confirmed',
    waitlist_position: null,
    ahead_count: null,
    called_at: null,
    call_expires_at: null,
    admitted_at: null,
    created_at: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/evt-1/ticket']}>
      <Routes>
        <Route path="/events/:id/ticket" element={<MyTicketPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MyTicketPage', () => {
  beforeEach(() => {
    getMyRsvp.mockReset();
    getRsvpQrToken.mockReset();
    getRsvpQrToken.mockResolvedValue({
      token: 'tok-1',
      expires_at: '2026-09-21T10:00:45Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra o QR de quem tem vaga confirmada', async () => {
    getMyRsvp.mockResolvedValue(rsvp());

    renderPage();

    expect(await screen.findByAltText(/código qr/i)).toBeInTheDocument();
    expect(screen.getByText(/vaga confirmada/i)).toBeInTheDocument();
  });

  it('renova o token periodicamente para o QR não expirar no ecrã', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getMyRsvp.mockResolvedValue(rsvp());

    renderPage();

    await waitFor(() => expect(getRsvpQrToken).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(30_000);

    await waitFor(() => expect(getRsvpQrToken).toHaveBeenCalledTimes(2));
  });

  it('para de renovar o token depois de sair do ecrã', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getMyRsvp.mockResolvedValue(rsvp());

    const { unmount } = renderPage();
    await waitFor(() => expect(getRsvpQrToken).toHaveBeenCalledTimes(1));

    unmount();
    await vi.advanceTimersByTimeAsync(90_000);

    expect(getRsvpQrToken).toHaveBeenCalledTimes(1);
  });

  it('mostra o prazo de quem foi chamado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-21T10:00:00Z'));
    getMyRsvp.mockResolvedValue(
      rsvp({ status: 'called', call_expires_at: '2026-09-21T10:02:00Z' }),
    );

    renderPage();

    expect(await screen.findByText(/é a tua vez/i)).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('não desenha QR a quem já entrou', async () => {
    getMyRsvp.mockResolvedValue(
      rsvp({ status: 'admitted', admitted_at: '2026-09-21T10:00:00Z' }),
    );

    renderPage();

    expect(await screen.findByText(/já entraste/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/código qr/i)).not.toBeInTheDocument();
    expect(getRsvpQrToken).not.toHaveBeenCalled();
  });

  it('mostra a posição de quem está na fila', async () => {
    getMyRsvp.mockResolvedValue(
      rsvp({ status: 'waitlisted', waitlist_position: 4, ahead_count: 3 }),
    );

    renderPage();

    expect(await screen.findByText(/3 pessoas à tua frente/i)).toBeInTheDocument();
  });

  it('avisa quem não foi inscrito neste evento', async () => {
    getMyRsvp.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText(/não estás inscrito/i)).toBeInTheDocument();
  });
});
