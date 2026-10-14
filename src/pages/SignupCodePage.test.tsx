import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readSignupTicket, saveSignupTicket } from '../utils/signupTicket.ts';

import SignupCodePage from './SignupCodePage.tsx';

const verifySignupCode = vi.hoisted(() => vi.fn());
const resendConfirmation = vi.hoisted(() => vi.fn());
const activateSignup = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  value: { user: null as unknown, session: null as unknown, loading: false, signOut: vi.fn() },
}));

vi.mock('../services/authApi.ts', () => ({ verifySignupCode, resendConfirmation }));
vi.mock('../services/flyerApi.ts', () => ({ activateSignup }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => auth.value }));

const TICKET = 't'.repeat(43);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/signup/code']}>
      <Routes>
        <Route path="/signup/code" element={<SignupCodePage />} />
        <Route path="/signup" element={<p>Ecrã de cadastro</p>} />
        <Route path="/" element={<p>Início</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function forbidden(detail: string): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('forbidden', 'ERR_BAD_REQUEST', { headers }, null, {
    status: 403,
    statusText: 'Forbidden',
    headers: {},
    config: { headers },
    data: { detail },
  });
}

describe('SignupCodePage', () => {
  beforeEach(() => {
    localStorage.clear();
    verifySignupCode.mockReset().mockResolvedValue({ ok: true });
    resendConfirmation.mockReset().mockResolvedValue({ ok: true });
    activateSignup.mockReset().mockResolvedValue(undefined);
    signOut.mockReset().mockResolvedValue(undefined);
    auth.value = { user: null, session: null, loading: false, signOut };
    saveSignupTicket({ ticket: TICKET, email: 'ana@example.com' });
  });

  it('vale em qualquer separador deste navegador (o bilhete fica no localStorage)', () => {
    // O cadastro guardou o bilhete; este ecrã é aberto noutro separador.
    renderPage();

    expect(screen.getByLabelText(/código/i)).toBeInTheDocument();
  });

  it('diz para onde foi o código', () => {
    renderPage();

    expect(screen.getByText(/ana@example.com/)).toBeInTheDocument();
  });

  it('o código certo ativa a conta com o bilhete deste navegador e entra', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/código/i), '123456');
    await user.click(screen.getByRole('button', { name: /ativar conta/i }));

    expect(await screen.findByText('Início')).toBeInTheDocument();
    expect(verifySignupCode).toHaveBeenCalledWith('ana@example.com', '123456');
    expect(activateSignup).toHaveBeenCalledWith(TICKET);
    expect(readSignupTicket()).toBeNull();
  });

  it('só aceita 6 dígitos', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText(/código/i);

    await user.type(input, '12a3-45678');

    expect(input).toHaveValue('123456');
  });

  it('o código errado não ativa nada', async () => {
    const user = userEvent.setup();
    verifySignupCode.mockResolvedValue({ ok: false, code: 'otp_expired', message: 'Código inválido ou expirado.' });
    renderPage();

    await user.type(screen.getByLabelText(/código/i), '000000');
    await user.click(screen.getByRole('button', { name: /ativar conta/i }));

    expect(await screen.findByText('Código inválido ou expirado.')).toBeInTheDocument();
    expect(activateSignup).not.toHaveBeenCalled();
    expect(readSignupTicket()).not.toBeNull();
  });

  it('se o backend recusar o bilhete, mostra o motivo e não entra', async () => {
    const user = userEvent.setup();
    activateSignup.mockRejectedValue(forbidden('Este código não foi pedido aqui.'));
    renderPage();

    await user.type(screen.getByLabelText(/código/i), '123456');
    await user.click(screen.getByRole('button', { name: /ativar conta/i }));

    expect(await screen.findByText('Este código não foi pedido aqui.')).toBeInTheDocument();
    expect(screen.queryByText('Início')).not.toBeInTheDocument();
  });

  it('com o código já aceite (sessão desta conta), só falta ativar', async () => {
    // A ativação falhou da 1.ª vez (rede): o código já foi gasto, não se pede outra vez.
    const user = userEvent.setup();
    auth.value = { ...auth.value, user: { id: 'user-9', email: 'ana@example.com' }, session: {} };
    renderPage();

    await user.click(screen.getByRole('button', { name: /ativar conta/i }));

    expect(await screen.findByText('Início')).toBeInTheDocument();
    expect(verifySignupCode).not.toHaveBeenCalled();
    expect(activateSignup).toHaveBeenCalledWith(TICKET);
  });

  it('reenviar o código só depois de 1 minuto', async () => {
    renderPage();

    expect(screen.getByRole('button', { name: /reenviar código/i })).toBeDisabled();
  });

  it('corrigir o e-mail esquece o bilhete e volta ao cadastro', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /corrigir e-mail/i }));

    expect(await screen.findByText('Ecrã de cadastro')).toBeInTheDocument();
    expect(readSignupTicket()).toBeNull();
  });

  it('noutro navegador (sem bilhete) não deixa ativar e explica porquê', () => {
    localStorage.clear();

    renderPage();

    expect(screen.getByText(/navegador onde fizeste o cadastro/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/código/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fazer o cadastro outra vez/i })).toHaveAttribute('href', '/signup');
  });

  it('sem bilhete e com sessão (o código sozinho), oferece sair', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    auth.value = { ...auth.value, user: { id: 'user-9', email: 'ana@example.com' }, session: {} };
    renderPage();

    await user.click(screen.getByRole('button', { name: /usar outra conta/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
