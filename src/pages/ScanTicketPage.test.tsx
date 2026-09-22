import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ScanTicketPage from './ScanTicketPage.tsx';

const scanTicket = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ scanTicket }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/evt-1/scan']}>
      <Routes>
        <Route path="/events/:id/scan" element={<ScanTicketPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ScanTicketPage', () => {
  beforeEach(() => {
    scanTicket.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });

  it('admite e mostra o nome de quem entrou', async () => {
    const user = userEvent.setup();
    scanTicket.mockResolvedValue({
      ok: true,
      status: 'admitted',
      attendee: { id: 'user-2', name: 'Ana Silva', email: null },
    });

    renderPage();

    await user.type(screen.getByLabelText(/código do bilhete/i), 'tok-1');
    await user.click(screen.getByRole('button', { name: /validar/i }));

    await waitFor(() => expect(scanTicket).toHaveBeenCalledWith('evt-1', 'tok-1'));
    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText(/entrada validada/i)).toBeInTheDocument();
  });

  it('mostra a razão que vem do backend quando o QR é recusado', async () => {
    const user = userEvent.setup();
    scanTicket.mockRejectedValue(new Error('QR expirado. Pede um novo ao participante.'));

    renderPage();

    await user.type(screen.getByLabelText(/código do bilhete/i), 'tok-velho');
    await user.click(screen.getByRole('button', { name: /validar/i }));

    expect(await screen.findByText(/qr expirado/i)).toBeInTheDocument();
  });

  it('não envia nada com o campo vazio', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', { name: /validar/i }));

    expect(scanTicket).not.toHaveBeenCalled();
  });

  it('avisa quando o dispositivo não tem câmara disponível', async () => {
    renderPage();

    // jsdom não expõe mediaDevices: a leitura manual tem de continuar a servir.
    expect(
      await screen.findByText(/não foi possível abrir a câmara/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/código do bilhete/i)).toBeInTheDocument();
  });

  it('desliga a câmara ao sair do ecrã', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const { unmount } = renderPage();
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());

    unmount();

    // Sem isto a luz da câmara fica acesa depois de trocar de página.
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });
});
