import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordPage from './ForgotPasswordPage.tsx';

const sendPasswordReset = vi.hoisted(() => vi.fn());

vi.mock('../services/authApi.ts', () => ({ sendPasswordReset }));

function ResetScreen() {
  const location = useLocation();
  return <p>Tela da senha nova {location.search}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    sendPasswordReset.mockReset();
  });

  it('pede o código e leva à tela da senha nova com o e-mail', async () => {
    const user = userEvent.setup();
    sendPasswordReset.mockResolvedValue({ ok: true });
    renderPage();

    await user.type(screen.getByLabelText(/^e-mail/i), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    await waitFor(() => expect(sendPasswordReset).toHaveBeenCalledWith('ana@example.com'));
    expect(await screen.findByText('Tela da senha nova ?email=ana%40example.com')).toBeInTheDocument();
  });

  it('segue igual quando o pedido falha por conta inexistente (não revela se a conta existe)', async () => {
    const user = userEvent.setup();
    sendPasswordReset.mockResolvedValue({ ok: false, code: 'user_not_found', message: 'x' });
    renderPage();

    await user.type(screen.getByLabelText(/^e-mail/i), 'ninguem@example.com');
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    expect(await screen.findByText(/tela da senha nova/i)).toBeInTheDocument();
  });

  it('avisa quando há pedidos a mais', async () => {
    const user = userEvent.setup();
    sendPasswordReset.mockResolvedValue({
      ok: false,
      code: 'over_email_send_rate_limit',
      message: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
    });
    renderPage();

    await user.type(screen.getByLabelText(/^e-mail/i), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    expect(await screen.findByText(/aguarde um minuto/i)).toBeInTheDocument();
    expect(screen.queryByText(/tela da senha nova/i)).toBeNull();
  });
});
