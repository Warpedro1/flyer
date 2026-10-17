import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeAccessToken } from '../test/tokens.ts';

import ResetPasswordPage from './ResetPasswordPage.tsx';

const updatePassword = vi.hoisted(() => vi.fn());
const verifyRecoveryCode = vi.hoisted(() => vi.fn());
const sendPasswordReset = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ value: { user: null as unknown, session: null as unknown, loading: false } }));

vi.mock('../services/authApi.ts', () => ({ updatePassword, verifyRecoveryCode, sendPasswordReset }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => auth.value }));

function renderPage(entry = '/reset-password?email=ana%40example.com') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<p>Início</p>} />
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function recoverySession() {
  auth.value = { user: { id: 'user-1' }, session: { access_token: fakeAccessToken(['recovery']) }, loading: false };
}

async function fillPasswords(user: ReturnType<typeof userEvent.setup>, password: string, confirm = password) {
  await user.type(screen.getByLabelText(/^nova senha/i), password);
  await user.type(screen.getByLabelText(/^confirmar senha/i), confirm);
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    updatePassword.mockReset().mockResolvedValue({ ok: true });
    verifyRecoveryCode.mockReset().mockResolvedValue({ ok: true });
    sendPasswordReset.mockReset().mockResolvedValue({ ok: true });
    auth.value = { user: null, session: null, loading: false };
  });

  it('com o código do e-mail, confirma o código, grava a senha nova e entra', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/se existir uma conta com ana@example.com, enviamos um código/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^código/i), '123456');
    await fillPasswords(user, 'frevo2026');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('frevo2026'));
    expect(verifyRecoveryCode).toHaveBeenCalledWith('ana@example.com', '123456');
    expect(verifyRecoveryCode.mock.invocationCallOrder[0]).toBeLessThan(updatePassword.mock.invocationCallOrder[0]);
    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('sem o e-mail no endereço, pede o e-mail', async () => {
    const user = userEvent.setup();
    renderPage('/reset-password');

    await user.type(screen.getByLabelText(/^e-mail/i), ' ana@example.com ');
    await user.type(screen.getByLabelText(/^código/i), '123456');
    await fillPasswords(user, 'frevo2026');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    await waitFor(() => expect(verifyRecoveryCode).toHaveBeenCalledWith('ana@example.com', '123456'));
  });

  it('código errado ou vencido: avisa e não grava a senha', async () => {
    const user = userEvent.setup();
    verifyRecoveryCode.mockResolvedValue({ ok: false, code: 'otp_expired', message: 'Código inválido ou expirado.' });
    renderPage();

    await user.type(screen.getByLabelText(/^código/i), '654321');
    await fillPasswords(user, 'frevo2026');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText('Código inválido ou expirado.')).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('o código precisa ter 6 dígitos', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^código/i), '12a4');
    await fillPasswords(user, 'frevo2026');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText(/o código tem 6 dígitos/i)).toBeInTheDocument();
    expect(verifyRecoveryCode).not.toHaveBeenCalled();
  });

  it('aplica as regras e a confirmação antes de usar o código', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^código/i), '123456');
    await fillPasswords(user, 'curta1', 'curta2');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText('Pelo menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    expect(verifyRecoveryCode).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('reenvia o código para o mesmo e-mail', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /reenviar código/i }));

    await waitFor(() => expect(sendPasswordReset).toHaveBeenCalledWith('ana@example.com'));
    expect(await screen.findByText(/enviamos um código novo/i)).toBeInTheDocument();
  });

  it('avisa quando há pedidos de reenvio a mais', async () => {
    const user = userEvent.setup();
    sendPasswordReset.mockResolvedValue({
      ok: false,
      code: 'over_email_send_rate_limit',
      message: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: /reenviar código/i }));

    expect(await screen.findByText(/aguarde um minuto/i)).toBeInTheDocument();
  });

  it('com a sessão de recuperação (link de um e-mail antigo), só pede a senha nova', async () => {
    const user = userEvent.setup();
    recoverySession();
    renderPage('/reset-password');

    expect(screen.queryByLabelText(/^código/i)).toBeNull();
    await fillPasswords(user, 'frevo2026');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('frevo2026'));
    expect(verifyRecoveryCode).not.toHaveBeenCalled();
  });

  it('uma sessão normal também precisa do código', () => {
    // Sem o código do e-mail, mudar a senha sem a atual seria um atalho para quem
    // pegasse um celular com a sessão aberta.
    auth.value = { user: { id: 'user-1' }, session: { access_token: fakeAccessToken(['password']) }, loading: false };

    renderPage();

    expect(screen.getByLabelText(/^código/i)).toBeInTheDocument();
  });

  it('se a senha nova for recusada depois do código, mostra o motivo', async () => {
    const user = userEvent.setup();
    updatePassword.mockResolvedValue({
      ok: false,
      code: 'same_password',
      message: 'A senha nova precisa ser diferente da anterior.',
    });
    renderPage();

    await user.type(screen.getByLabelText(/^código/i), '123456');
    await fillPasswords(user, 'frevo2026');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText(/precisa ser diferente da anterior/i)).toBeInTheDocument();
    expect(screen.queryByText('Início')).toBeNull();
  });
});
