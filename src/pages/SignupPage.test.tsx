import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SignupPage from './SignupPage.tsx';

const signUpWithEmail = vi.hoisted(() => vi.fn());
const resendConfirmation = vi.hoisted(() => vi.fn());

// O cadastro vai pelo backend (valida CPF/celular e diz o que já tem conta).
vi.mock('../services/flyerApi.ts', () => ({ signUpWithEmail }));
vi.mock('../services/authApi.ts', () => ({ resendConfirmation }));
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
  {
    name = 'Ana',
    email = 'ana@example.com',
    cpf = '52998224725',
    phone = '81912345678',
    password = 'frevo2026',
    confirm = 'frevo2026',
  } = {},
) {
  await user.type(screen.getByLabelText(/^nome/i), name);
  await user.type(screen.getByLabelText(/^e-mail/i), email);
  await user.type(screen.getByLabelText(/^cpf/i), cpf);
  await user.type(screen.getByLabelText(/^celular/i), phone);
  await user.type(screen.getByLabelText(/^senha/i), password);
  await user.type(screen.getByLabelText(/^confirmar senha/i), confirm);
  await user.click(screen.getByRole('button', { name: /criar conta/i }));
}

describe('SignupPage', () => {
  beforeEach(() => {
    signUpWithEmail.mockReset().mockResolvedValue(undefined);
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
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it('o CPF e o celular formatam-se enquanto se escrevem', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^cpf/i), '52998224725');
    await user.type(screen.getByLabelText(/^celular/i), '81912345678');

    expect(screen.getByLabelText(/^cpf/i)).toHaveValue('529.982.247-25');
    expect(screen.getByLabelText(/^celular/i)).toHaveValue('(81) 91234-5678');
  });

  it('CPF ou celular inválidos não criam a conta', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { cpf: '52998224724', phone: '8131234567' });

    expect(await screen.findByText('CPF inválido')).toBeInTheDocument();
    expect(screen.getByText(/celular inválido/i)).toBeInTheDocument();
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it('senhas diferentes não criam a conta', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { confirm: 'frevo2027' });

    expect(await screen.findByText(/as senhas não coincidem/i)).toBeInTheDocument();
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it('cria a conta com o nome e pede para confirmar o e-mail', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { name: '  Ana Lima ' });

    await waitFor(() =>
      expect(signUpWithEmail).toHaveBeenCalledWith({
        name: 'Ana Lima',
        email: 'ana@example.com',
        cpf: '529.982.247-25',
        phone: '(81) 91234-5678',
        password: 'frevo2026',
      }),
    );
    expect(await screen.findByText(/enviámos um link para ana@example.com/i)).toBeInTheDocument();
    // Pode reenviar, mas não já: o Supabase só deixa um e-mail por minuto.
    expect(screen.getByRole('button', { name: /reenviar/i })).toBeDisabled();
  });

  it('diz o que já tem conta e oferece recuperar a senha', async () => {
    const user = userEvent.setup();
    signUpWithEmail.mockRejectedValue(new Error('Este CPF já tem uma conta.'));
    renderPage();

    await fill(user);

    expect(await screen.findByText('Este CPF já tem uma conta.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /esqueci a senha/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('tem o link para quem já tem conta', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /já tenho conta/i }));

    expect(screen.getByText('Ecrã de login')).toBeInTheDocument();
  });
});
