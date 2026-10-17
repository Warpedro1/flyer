import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeAccessToken } from '../test/tokens.ts';
import { saveSignupTicket } from '../utils/signupTicket.ts';

import LoginPage from './LoginPage.tsx';

const signInWithPassword = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  value: { user: null as unknown, session: null as unknown, loading: false, signInWithGoogle: vi.fn(), signOut: vi.fn() },
}));

vi.mock('../services/authApi.ts', () => ({ signInWithPassword }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => auth.value }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/code" element={<p>Tela do código</p>} />
        <Route path="/signup" element={<p>Tela de cadastro</p>} />
        <Route path="/forgot-password" element={<p>Tela esqueci a senha</p>} />
        <Route path="/" element={<p>Início</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(user: ReturnType<typeof userEvent.setup>, email = 'ana@example.com', password = 'frevo2026') {
  await user.type(screen.getByLabelText(/^e-mail/i), email);
  await user.type(screen.getByLabelText(/^senha/i), password);
  await user.click(screen.getByRole('button', { name: /^entrar$/i }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    localStorage.clear();
    auth.value = { ...auth.value, user: null, session: null, loading: false };
  });

  it('tem e-mail e senha, o Google e os links para criar conta e recuperar a senha', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText(/^e-mail/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^senha/i)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /criar conta/i }));
    expect(screen.getByText('Tela de cadastro')).toBeInTheDocument();
  });

  it('o link "Esqueci a senha" leva à recuperação', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /esqueci a senha/i }));

    expect(screen.getByText('Tela esqueci a senha')).toBeInTheDocument();
  });

  it('entrar com a senha leva ao código enviado por e-mail', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ ok: true });
    renderPage();

    await fill(user);

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith('ana@example.com', 'frevo2026'));
    expect(await screen.findByText('Tela do código')).toBeInTheDocument();
  });

  it('com a senha errada não diz se o e-mail existe', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ ok: false, code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
    renderPage();

    await fill(user);

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument();
  });

  it('com o cadastro por concluir leva a pôr o código, se este navegador tiver o bilhete', async () => {
    const user = userEvent.setup();
    saveSignupTicket({ ticket: 't'.repeat(43), email: 'ana@example.com' });
    signInWithPassword.mockResolvedValue({
      ok: false,
      code: 'email_not_confirmed',
      message: 'O cadastro não foi concluído.',
    });
    renderPage();

    await fill(user);

    expect(await screen.findByRole('link', { name: /digitar o código/i })).toHaveAttribute('href', '/signup/code');
    expect(screen.queryByRole('button', { name: /reenviar link/i })).not.toBeInTheDocument();
  });

  it('com o cadastro por concluir e sem bilhete, leva a fazer o cadastro outra vez', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    signInWithPassword.mockResolvedValue({
      ok: false,
      code: 'email_not_confirmed',
      message: 'O cadastro não foi concluído.',
    });
    renderPage();

    await fill(user);

    expect(await screen.findByRole('link', { name: /fazer o cadastro outra vez/i })).toHaveAttribute('href', '/signup');
  });

  it('quem já entrou com o Google vai para o início', () => {
    auth.value = { ...auth.value, user: { id: 'user-1' }, session: { access_token: fakeAccessToken(['oauth']) } };

    renderPage();

    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('quem entrou com a senha e ainda não pôs o código vai para o código', () => {
    auth.value = { ...auth.value, user: { id: 'user-1' }, session: { access_token: fakeAccessToken(['password']) } };

    renderPage();

    expect(screen.getByText('Tela do código')).toBeInTheDocument();
  });
});
