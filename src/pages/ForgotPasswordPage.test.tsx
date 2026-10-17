import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordPage from './ForgotPasswordPage.tsx';

const sendPasswordReset = vi.hoisted(() => vi.fn());

vi.mock('../services/authApi.ts', () => ({ sendPasswordReset }));

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    sendPasswordReset.mockReset();
  });

  it('pede o link e responde sempre o mesmo (não revela se a conta existe)', async () => {
    const user = userEvent.setup();
    sendPasswordReset.mockResolvedValue({ ok: true });
    renderPage();

    await user.type(screen.getByLabelText(/^e-mail/i), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    await waitFor(() => expect(sendPasswordReset).toHaveBeenCalledWith('ana@example.com'));
    expect(await screen.findByText(/se existir uma conta com ana@example.com/i)).toBeInTheDocument();
  });

  it('a mesma resposta quando o pedido falha por conta inexistente', async () => {
    const user = userEvent.setup();
    sendPasswordReset.mockResolvedValue({ ok: false, code: 'user_not_found', message: 'x' });
    renderPage();

    await user.type(screen.getByLabelText(/^e-mail/i), 'ninguem@example.com');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(await screen.findByText(/se existir uma conta/i)).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(await screen.findByText(/aguarde um minuto/i)).toBeInTheDocument();
  });
});
