import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RsvpRead } from '../types/index.ts';

import MyTicketPage from './MyTicketPage.tsx';

const getMyRsvp = vi.hoisted(() => vi.fn());
const getRsvpQrToken = vi.hoisted(() => vi.fn());

const channel = vi.hoisted(() => ({
  userId: null as string | null,
  handlers: {} as Record<string, (data: unknown) => void>,
}));

vi.mock('../services/flyerApi.ts', () => ({ getMyRsvp, getRsvpQrToken }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('../hooks/useUserChannel.ts', () => ({
  useUserChannel: (userId: string | null, handlers: Record<string, (data: unknown) => void>) => {
    channel.userId = userId;
    channel.handlers = handlers;
  },
}));

type WatchSuccess = (position: GeolocationPosition) => void;
type WatchError = (error: GeolocationPositionError) => void;

/** GPS falso: guarda os callbacks para o teste mandar posições ou erros. */
function fakeGps() {
  const gps = { success: null as WatchSuccess | null, error: null as WatchError | null };
  const clearWatch = vi.fn();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: vi.fn((success: WatchSuccess, error: WatchError) => {
        gps.success = success;
        gps.error = error;
        return 7;
      }),
      clearWatch,
    },
  });
  return { gps, clearWatch };
}

function fix(lat: number, long: number, accuracy: number): GeolocationPosition {
  return {
    coords: { latitude: lat, longitude: long, accuracy },
    timestamp: Date.parse('2026-10-17T20:00:00Z'),
  } as unknown as GeolocationPosition;
}
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
    Reflect.deleteProperty(navigator, 'geolocation');
    Reflect.deleteProperty(navigator, 'vibrate');
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
    // Só o relógio fica parado: os timers correm de verdade, e o prazo não se mexe
    // numa máquina lenta.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-21T10:00:00Z'));
    getMyRsvp.mockResolvedValue(
      rsvp({ status: 'called', call_expires_at: '2026-09-21T10:02:00Z' }),
    );

    renderPage();

    expect(await screen.findByText(/é a sua vez/i)).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('não desenha QR a quem já entrou', async () => {
    getMyRsvp.mockResolvedValue(
      rsvp({ status: 'admitted', admitted_at: '2026-09-21T10:00:00Z' }),
    );

    renderPage();

    expect(await screen.findByText(/check-in feito/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/código qr/i)).not.toBeInTheDocument();
    expect(getRsvpQrToken).not.toHaveBeenCalled();
  });

  it('mostra a posição de quem está na fila', async () => {
    getMyRsvp.mockResolvedValue(
      rsvp({ status: 'waitlisted', waitlist_position: 4, ahead_count: 3 }),
    );

    renderPage();

    expect(await screen.findByText(/3 pessoas na sua frente/i)).toBeInTheDocument();
  });

  it('avisa quem não foi inscrito neste evento', async () => {
    getMyRsvp.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText(/você não está inscrito/i)).toBeInTheDocument();
  });

  // ------------------------------------------- localização e aviso (2026-10-17) --

  it('manda a posição do celular junto com o QR e refaz o QR quando ela chega', async () => {
    const { gps } = fakeGps();
    getMyRsvp.mockResolvedValue(rsvp());

    renderPage();
    await waitFor(() => expect(getRsvpQrToken).toHaveBeenCalledTimes(1));
    expect(getRsvpQrToken).toHaveBeenLastCalledWith('evt-1', {});

    act(() => gps.success?.(fix(-8.06, -34.87, 12)));

    await waitFor(() => expect(getRsvpQrToken).toHaveBeenCalledTimes(2));
    expect(getRsvpQrToken).toHaveBeenLastCalledWith('evt-1', {
      lat: -8.06,
      long: -34.87,
      accuracy: 12,
      fix_at: '2026-10-17T20:00:00.000Z',
    });
    expect(screen.getByText(/localização ativa/i)).toBeInTheDocument();
  });

  it('pede para ativar a localização quando ela é negada', async () => {
    const { gps } = fakeGps();
    getMyRsvp.mockResolvedValue(rsvp());

    renderPage();
    await waitFor(() => expect(gps.error).not.toBeNull());

    act(() => gps.error?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError));

    expect(await screen.findByText(/ative a localização/i)).toBeInTheDocument();
    // O QR continua: o organizador pode confirmar a entrada sem a localização.
    expect(await screen.findByAltText(/código qr/i)).toBeInTheDocument();
  });

  it('para o GPS ao sair da tela', async () => {
    const { clearWatch } = fakeGps();
    getMyRsvp.mockResolvedValue(rsvp());

    const { unmount } = renderPage();
    await waitFor(() => expect(navigator.geolocation.watchPosition).toHaveBeenCalled());

    unmount();

    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('mostra o check-in feito assim que o ingresso é lido na entrada', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    getMyRsvp.mockResolvedValue(rsvp());

    renderPage();
    await waitFor(() => expect(getRsvpQrToken).toHaveBeenCalledTimes(1));
    expect(channel.userId).toBe('user-1');

    act(() =>
      channel.handlers['checkin:done']?.({
        event_id: 'evt-1',
        trophy: {
          id: 'tr-1',
          template_id: 'tpl-1',
          name: 'Presença: Noite de Frevo',
          description: null,
          icon_url: null,
          acquired_at: null,
        },
      }),
    );

    expect(await screen.findByText(/check-in feito/i)).toBeInTheDocument();
    expect(screen.getByText('Presença: Noite de Frevo')).toBeInTheDocument();
    expect(screen.queryByAltText(/código qr/i)).not.toBeInTheDocument();
    expect(vibrate).toHaveBeenCalled();
    // Sem QR na tela, não há mais nada para renovar.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(getRsvpQrToken).toHaveBeenCalledTimes(1);
  });

  it('ignora o aviso de outro evento', async () => {
    getMyRsvp.mockResolvedValue(rsvp());

    renderPage();
    expect(await screen.findByAltText(/código qr/i)).toBeInTheDocument();

    act(() => channel.handlers['checkin:done']?.({ event_id: 'evt-2', trophy: null }));

    expect(screen.queryByText(/check-in feito/i)).not.toBeInTheDocument();
    expect(screen.getByAltText(/código qr/i)).toBeInTheDocument();
  });

  it('sem tempo real, descobre a entrada consultando a inscrição', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getMyRsvp.mockResolvedValue(rsvp());

    renderPage();
    await waitFor(() => expect(getRsvpQrToken).toHaveBeenCalledTimes(1));

    getMyRsvp.mockResolvedValue(rsvp({ status: 'admitted', admitted_at: '2026-10-17T20:00:00Z' }));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await screen.findByText(/check-in feito/i)).toBeInTheDocument();
  });

  it('a consulta também mostra quando chega a vez de quem está na fila', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getMyRsvp.mockResolvedValue(rsvp({ status: 'waitlisted', waitlist_position: 2, ahead_count: 1 }));

    renderPage();
    expect(await screen.findByText(/1 pessoa na sua frente/i)).toBeInTheDocument();

    getMyRsvp.mockResolvedValue(rsvp({ status: 'called', call_expires_at: '2099-01-01T00:00:00Z' }));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await screen.findByText(/é a sua vez/i)).toBeInTheDocument();
  });

  it('para de consultar depois de sair da tela', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getMyRsvp.mockResolvedValue(rsvp());

    const { unmount } = renderPage();
    await waitFor(() => expect(getMyRsvp).toHaveBeenCalledTimes(1));

    unmount();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(getMyRsvp).toHaveBeenCalledTimes(1);
  });
});
