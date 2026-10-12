import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SignupPage from './SignupPage.tsx';

const signUp = vi.hoisted(() => vi.fn());
const resendConfirmation = vi.hoisted(() => vi.fn());

vi.mock('../services/authApi.ts', () => ({ signUp, resendConfirmation }));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signInWithGoogle: vi.fn(), signOut: vi.fn() }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<p>Ecrã de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { name = 'Ana', email = 'ana@example.com', password = 'frevo2026', confirm = 'frevo2026' } = {},
) {
  await user.type(screen.getByLabelText(/^nome/i), name);
  await user.type(screen.getByLabelText(/^e-mail/i), email);
  await user.type(screen.getByLabelText(/^senha/i), password);
  await user.type(screen.getByLabelText(/^confirmar senha/i), confirm);
  await user.click(screen.getByRole('button', { name: /criar conta/i }));
}

describe('SignupPage', () => {
  beforeEach(() => {
    signUp.mockReset().mockResolvedValue({ ok: true });
    resendConfirmation.mockReset().mockResolvedValue({ ok: true });
  });

  it('mostra a regra da senha', () => {
    renderPage();

    expect(screen.getByText(/8 caracteres/i)).toBeInTheDocument();
  });

  it('uma senha fraca não cria a conta e diz o que falta', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { password: 'abcdefgh', confirm: 'abcdefgh' });

    expect(await screen.findByText(/pelo menos um número/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('senhas diferentes não criam a conta', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { confirm: 'frevo2027' });

    expect(await screen.findByText(/as senhas não coincidem/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('cria a conta com o nome e pede para confirmar o e-mail', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { name: '  Ana Lima ' });

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('Ana Lima', 'ana@example.com', 'frevo2026'));
    expect(await screen.findByText(/enviámos um link para ana@example.com/i)).toBeInTheDocument();
    // Pode reenviar, mas não já: o Supabase só deixa um e-mail por minuto.
    expect(screen.getByRole('button', { name: /reenviar/i })).toBeDisabled();
  });

  it('mostra o erro do cadastro', async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ ok: false, code: 'weak_password', message: 'Esta senha é fraca ou já apareceu numa fuga de dados. Escolhe outra.' });
    renderPage();

    await fill(user);

    expect(await screen.findByText(/escolhe outra/i)).toBeInTheDocument();
  });

  it('tem o link para quem já tem conta', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /já tenho conta/i }));

    expect(screen.getByText('Ecrã de login')).toBeInTheDocument();
  });
});
