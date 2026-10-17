import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeAccessToken } from '../test/tokens.ts';

import ResetPasswordPage from './ResetPasswordPage.tsx';

const updatePassword = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ value: { user: null as unknown, session: null as unknown, loading: false } }));

vi.mock('../services/authApi.ts', () => ({ updatePassword }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => auth.value }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<p>Início</p>} />
        <Route path="/forgot-password" element={<p>Tela esqueci a senha</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function recoverySession() {
  auth.value = { user: { id: 'user-1' }, session: { access_token: fakeAccessToken(['recovery']) }, loading: false };
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    updatePassword.mockReset().mockResolvedValue({ ok: true });
    auth.value = { user: null, session: null, loading: false };
  });

  it('pelo link de recuperação, grava a senha nova e entra', async () => {
    const user = userEvent.setup();
    recoverySession();
    renderPage();

    await user.type(screen.getByLabelText(/^nova senha/i), 'frevo2026');
    await user.type(screen.getByLabelText(/^confirmar senha/i), 'frevo2026');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('frevo2026'));
    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('aplica as regras e a confirmação', async () => {
    const user = userEvent.setup();
    recoverySession();
    renderPage();

    await user.type(screen.getByLabelText(/^nova senha/i), 'curta1');
    await user.type(screen.getByLabelText(/^confirmar senha/i), 'curta2');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText('Pelo menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('sem o link, diz que expirou e leva a pedir outro', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/o link expirou ou já foi usado/i)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /pedir outro link/i }));
    expect(screen.getByText('Tela esqueci a senha')).toBeInTheDocument();
  });

  it('uma sessão normal não muda a senha por aqui', () => {
    // Sem o link do e-mail, mudar a senha sem a atual seria um atalho para quem
    // pegasse num telemóvel com a sessão aberta.
    auth.value = { user: { id: 'user-1' }, session: { access_token: fakeAccessToken(['password']) }, loading: false };

    renderPage();

    expect(screen.getByText(/o link expirou ou já foi usado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nova senha/i)).toBeNull();
  });
});
