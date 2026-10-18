import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScanResult } from '../types/index.ts';

import ScanTicketPage from './ScanTicketPage.tsx';

const scanTicket = vi.hoisted(() => vi.fn());
const openCheckin = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ scanTicket, openCheckin }));

const OK: ScanResult = {
  ok: true,
  status: 'admitted',
  attendee: { id: 'user-2', name: 'Ana Silva' },
  trophy: {
    id: 'tr-1',
    template_id: 'tpl-1',
    name: 'Presença: Noite de Frevo',
    description: null,
    icon_url: null,
    acquired_at: null,
    event_id: null,
  },
  location_checked: true,
};

/** Um erro como o axios devolve, com `code` (ApiError do backend). */
function apiError(status: number, code: string, detail: string) {
  return Object.assign(new Error(detail), {
    isAxiosError: true,
    response: { status, data: { detail, code, request_id: 'r1' }, headers: {} },
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/evt-1/scan']}>
      <Routes>
        <Route path="/events/:id/scan" element={<ScanTicketPage />} />
        <Route path="/events/:id/attendees" element={<p>Lista de participantes</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Câmera e BarcodeDetector falsos: o QR `value` fica "na frente da câmera". */
function fakeCamera(value: { current: string | null }) {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  const detect = vi.fn(async () => (value.current ? [{ rawValue: value.current }] : []));
  Object.defineProperty(globalThis, 'BarcodeDetector', {
    configurable: true,
    value: class {
      detect = detect;
    },
  });
  return { detect, stop };
}

describe('ScanTicketPage', () => {
  const vibrate = vi.fn();

  beforeEach(() => {
    scanTicket.mockReset();
    openCheckin.mockReset();
    vibrate.mockReset();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'mediaDevices');
    Reflect.deleteProperty(navigator, 'vibrate');
    Reflect.deleteProperty(globalThis, 'BarcodeDetector');
  });

  it('trava ao ler, valida uma vez só e mostra o check-in feito', async () => {
    const value = { current: 'tok-1' as string | null };
    fakeCamera(value);
    let finish: (result: ScanResult) => void = () => undefined;
    scanTicket.mockReturnValue(new Promise<ScanResult>((resolve) => (finish = resolve)));

    renderPage();

    expect(await screen.findByText(/validando ingresso/i)).toBeInTheDocument();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    // O mesmo QR continua na frente da câmera: não pode virar vários pedidos.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(scanTicket).toHaveBeenCalledTimes(1);
    expect(scanTicket).toHaveBeenCalledWith('evt-1', 'tok-1', { confirmWithoutLocation: false });

    await act(async () => finish(OK));

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText(/check-in feito/i)).toBeInTheDocument();
    expect(screen.getByText('Presença: Noite de Frevo')).toBeInTheDocument();
    expect(vibrate).toHaveBeenCalled();
  });

  it('volta sozinho para a câmera depois do sucesso, sem reler o mesmo QR', async () => {
    const value = { current: 'tok-1' as string | null };
    fakeCamera(value);
    scanTicket.mockResolvedValue(OK);

    renderPage();
    expect(await screen.findByText(/check-in feito/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText(/check-in feito/i)).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(screen.getByText(/aponte a câmera/i)).toBeInTheDocument();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    // O ingresso de quem acabou de entrar ainda está na frente da câmera.
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(scanTicket).toHaveBeenCalledTimes(1);

    value.current = 'tok-2';
    await waitFor(() => expect(scanTicket).toHaveBeenCalledTimes(2));
    expect(scanTicket).toHaveBeenLastCalledWith('evt-1', 'tok-2', { confirmWithoutLocation: false });
  }, 10_000);

  it('na recusa mostra a razão e espera o organizador para ler outro', async () => {
    const user = userEvent.setup();
    const value = { current: 'tok-1' as string | null };
    fakeCamera(value);
    scanTicket.mockRejectedValue(apiError(409, 'not_your_turn', 'Ainda não é a vez desta pessoa.'));

    renderPage();

    expect(await screen.findByText('Ainda não é a vez desta pessoa.')).toBeInTheDocument();
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    // Não some sozinho: a pessoa na porta precisa ouvir o motivo.
    expect(screen.getByText('Ainda não é a vez desta pessoa.')).toBeInTheDocument();

    value.current = null;
    await user.click(screen.getByRole('button', { name: /ler outro qr/i }));

    expect(screen.queryByText('Ainda não é a vez desta pessoa.')).not.toBeInTheDocument();
    expect(screen.getByText(/aponte a câmera/i)).toBeInTheDocument();
  }, 10_000);

  it('sem a localização do participante, o organizador pode confirmar', async () => {
    const user = userEvent.setup();
    fakeCamera({ current: 'tok-1' });
    scanTicket
      .mockRejectedValueOnce(apiError(409, 'location_missing', 'Não recebemos a localização de Ana Silva.'))
      .mockResolvedValueOnce({ ...OK, location_checked: false });

    renderPage();

    expect(await screen.findByText('Não recebemos a localização de Ana Silva.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirmar mesmo assim/i }));

    expect(await screen.findByText(/check-in feito/i)).toBeInTheDocument();
    expect(scanTicket).toHaveBeenLastCalledWith('evt-1', 'tok-1', { confirmWithoutLocation: true });
  });

  it('cancelar a confirmação volta para a câmera sem fazer check-in', async () => {
    const user = userEvent.setup();
    fakeCamera({ current: 'tok-1' });
    scanTicket.mockRejectedValue(apiError(409, 'location_missing', 'Não recebemos a localização de Ana.'));

    renderPage();

    await user.click(await screen.findByRole('button', { name: /cancelar/i }));

    expect(screen.getByText(/aponte a câmera/i)).toBeInTheDocument();
    expect(scanTicket).toHaveBeenCalledTimes(1);
  });

  it('com o check-in ainda fechado, abre e lê de novo o mesmo QR', async () => {
    const user = userEvent.setup();
    fakeCamera({ current: 'tok-1' });
    openCheckin.mockResolvedValue({});
    scanTicket
      .mockRejectedValueOnce(apiError(409, 'checkin_not_open', 'O check-in abre às 20:00 de 17/10.'))
      .mockResolvedValueOnce(OK);

    renderPage();

    await user.click(await screen.findByRole('button', { name: /abrir check-in agora/i }));

    expect(await screen.findByText(/check-in feito/i)).toBeInTheDocument();
    expect(openCheckin).toHaveBeenCalledWith('evt-1');
    expect(scanTicket).toHaveBeenCalledTimes(2);
  });

  it('a entrada manual faz o mesmo check-in', async () => {
    const user = userEvent.setup();
    scanTicket.mockResolvedValue(OK);

    renderPage();

    await user.type(screen.getByLabelText(/código do ingresso/i), 'tok-1');
    await user.click(screen.getByRole('button', { name: /validar/i }));

    await waitFor(() =>
      expect(scanTicket).toHaveBeenCalledWith('evt-1', 'tok-1', { confirmWithoutLocation: false }),
    );
    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
  });

  it('não envia nada com o campo vazio', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', { name: /validar/i }));

    expect(scanTicket).not.toHaveBeenCalled();
  });

  it('"Concluir" volta para a lista de participantes', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', { name: /concluir/i }));

    expect(screen.getByText('Lista de participantes')).toBeInTheDocument();
  });

  it('avisa quando o dispositivo não tem câmera disponível', async () => {
    renderPage();

    // jsdom não expõe mediaDevices: a leitura manual tem de continuar a servir.
    expect(await screen.findByText(/não foi possível abrir a câmera/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/código do ingresso/i)).toBeInTheDocument();
  });

  it('desliga a câmera ao sair da tela', async () => {
    const { stop } = fakeCamera({ current: null });

    const { unmount } = renderPage();
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());

    unmount();

    // Sem isto a luz da câmera fica acesa depois de trocar de página.
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });
});
