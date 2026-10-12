import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeAccessToken } from '../test/tokens.ts';

import EmailCodePage from './EmailCodePage.tsx';

const sendEmailCode = vi.hoisted(() => vi.fn());
const verifyEmailCode = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  value: { user: null as unknown, session: null as unknown, loading: false, signOut: vi.fn() },
}));

vi.mock('../services/flyerApi.ts', () => ({ sendEmailCode, verifyEmailCode }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => auth.value }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login/code']}>
      <Routes>
        <Route path="/login/code" element={<EmailCodePage />} />
        <Route path="/" element={<p>Início</p>} />
        <Route path="/login" element={<p>Ecrã de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function badCode(): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('bad', 'ERR_BAD_REQUEST', { headers }, null, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers },
    data: { detail: 'Código inválido ou expirado.' },
  });
}

describe('EmailCodePage', () => {
  beforeEach(() => {
    sendEmailCode.mockReset().mockResolvedValue(undefined);
    verifyEmailCode.mockReset().mockResolvedValue(undefined);
    signOut.mockReset().mockResolvedValue(undefined);
    auth.value = {
      user: { id: 'user-1', email: 'ana@example.com' },
      session: { access_token: fakeAccessToken(['password']) },
      loading: false,
      signOut,
    };
  });

  it('envia o código uma vez ao abrir e diz para onde', async () => {
    renderPage();

    await waitFor(() => expect(sendEmailCode).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/ana@example.com/)).toBeInTheDocument();
  });

  it('só aceita 6 dígitos', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText(/código/i);

    await user.type(input, '12a3-45678');

    expect(input).toHaveValue('123456');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  it('o código certo leva ao início', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/código/i), '123456');
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith('123456'));
    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('o código errado mostra o erro', async () => {
    const user = userEvent.setup();
    verifyEmailCode.mockRejectedValue(badCode());
    renderPage();

    await user.type(screen.getByLabelText(/código/i), '000000');
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText('Código inválido ou expirado.')).toBeInTheDocument();
  });

  it('reenviar só fica disponível passado um minuto', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /reenviar código/i })).toBeDisabled();
  });

  it('"Usar outra conta" termina a sessão', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /usar outra conta/i }));

    expect(signOut).toHaveBeenCalled();
    expect(await screen.findByText('Ecrã de login')).toBeInTheDocument();
  });

  it('sem sessão volta ao login', () => {
    auth.value = { user: null, session: null, loading: false, signOut };

    renderPage();

    expect(screen.getByText('Ecrã de login')).toBeInTheDocument();
    expect(sendEmailCode).not.toHaveBeenCalled();
  });

  it('uma sessão que não precisa de código vai para o início', () => {
    auth.value = { ...auth.value, session: { access_token: fakeAccessToken(['oauth']) } };

    renderPage();

    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(sendEmailCode).not.toHaveBeenCalled();
  });
});
