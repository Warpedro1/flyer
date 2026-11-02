import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readSignupTicket } from '../utils/signupTicket.ts';

import SignupPage from './SignupPage.tsx';

const signUpWithEmail = vi.hoisted(() => vi.fn());
const checkUsername = vi.hoisted(() => vi.fn());

// O cadastro vai pelo backend (valida CPF/celular e diz o que já tem conta).
vi.mock('../services/flyerApi.ts', () => ({ signUpWithEmail, checkUsername }));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signInWithGoogle: vi.fn(), signOut: vi.fn() }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<p>Tela de login</p>} />
        <Route path="/signup/code" element={<p>Tela do código do cadastro</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  {
    name = 'Ana',
    username = 'ana.lima',
    nickname = '',
    email = 'ana@example.com',
    cpf = '52998224725',
    phone = '81912345678',
    password = 'frevo2026',
    confirm = 'frevo2026',
  } = {},
) {
  await user.type(screen.getByLabelText(/^nome/i), name);
  // Ao sair do nome, o @usuário vem sugerido; aqui escreve-se o pretendido.
  const handle = screen.getByLabelText(/^@usuário/i);
  await user.clear(handle);
  if (username) await user.type(handle, username);
  if (nickname) await user.type(screen.getByLabelText(/^vulgo/i), nickname);
  await user.type(screen.getByLabelText(/^e-mail/i), email);
  await user.type(screen.getByLabelText(/^cpf/i), cpf);
  if (phone) await user.type(screen.getByLabelText(/^celular/i), phone);
  await user.type(screen.getByLabelText(/^senha/i), password);
  await user.type(screen.getByLabelText(/^confirmar senha/i), confirm);
  await user.click(screen.getByRole('button', { name: /criar conta/i }));
}

describe('SignupPage', () => {
  beforeEach(() => {
    localStorage.clear();
    signUpWithEmail.mockReset().mockResolvedValue({ ticket: 't'.repeat(43) });
    checkUsername.mockReset().mockResolvedValue({ available: true, reason: null, suggestion: null });
  });

  it('sugere o @usuário a partir do nome', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^nome/i), 'Ana Lima');
    await user.tab();

    expect(screen.getByLabelText(/^@usuário/i)).toHaveValue('ana.lima');
    expect(await screen.findByText(/disponível/i)).toBeInTheDocument();
  });

  it('avisa quando o @usuário está em uso e oferece outro', async () => {
    const user = userEvent.setup();
    checkUsername.mockResolvedValue({ available: false, reason: 'taken', suggestion: 'ana.lima42' });
    renderPage();

    await user.type(screen.getByLabelText(/^@usuário/i), 'ana.lima');
    await user.click(await screen.findByRole('button', { name: 'Usar @ana.lima42' }));

    expect(screen.getByLabelText(/^@usuário/i)).toHaveValue('ana.lima42');
    // O botão some: o foco volta para o campo.
    expect(screen.getByLabelText(/^@usuário/i)).toHaveFocus();
  });

  it('o campo aponta para a conferência e fica inválido quando ela recusa', async () => {
    const user = userEvent.setup();
    checkUsername.mockResolvedValue({ available: false, reason: 'reserved', suggestion: null });
    renderPage();

    const handle = screen.getByLabelText(/^@usuário/i);
    await user.type(handle, 'flyer1');

    expect(await screen.findByText(/é reservado/i)).toBeInTheDocument();
    expect(handle).toHaveAttribute('aria-invalid', 'true');
    expect(handle).toHaveAccessibleDescription(/é reservado/i);
  });

  it('não envia sem @usuário', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { username: '' });

    expect(await screen.findByText(/escolha um @usuário/i)).toBeInTheDocument();
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it('não envia um @usuário que a conferência recusou', async () => {
    const user = userEvent.setup();
    checkUsername.mockResolvedValue({ available: false, reason: 'reserved', suggestion: null });
    renderPage();

    await user.type(screen.getByLabelText(/^@usuário/i), 'flyer1');
    await screen.findAllByText(/é reservado/i);
    await fill(user, { username: 'flyer1' });

    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it('um @usuário "em uso" ainda vai ao backend, que libera o cadastro não ativado da própria pessoa', async () => {
    const user = userEvent.setup();
    checkUsername.mockResolvedValue({ available: false, reason: 'taken', suggestion: 'ana.lima42' });
    renderPage();

    await fill(user);

    await waitFor(() => expect(signUpWithEmail).toHaveBeenCalledWith(expect.objectContaining({ username: 'ana.lima' })));
  });

  it('dois cliques seguidos criam a conta uma vez só', async () => {
    const user = userEvent.setup();
    let finish: (value: { ticket: string }) => void = () => undefined;
    signUpWithEmail.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();

    await fill(user, { username: 'ana.lima' });
    // Dois envios no mesmo instante, antes de o botão desabilitar.
    const form = screen.getByRole('button', { name: /criando|criar conta/i }).closest('form');
    if (!form) throw new Error('sem formulário');
    fireEvent.submit(form);
    fireEvent.submit(form);
    finish({ ticket: 't'.repeat(43) });

    expect(await screen.findByText('Tela do código do cadastro')).toBeInTheDocument();
    expect(signUpWithEmail).toHaveBeenCalledTimes(1);
  });

  it('envia o vulgo quando preenchido', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { nickname: 'Aninha' });

    await waitFor(() =>
      expect(signUpWithEmail).toHaveBeenCalledWith(expect.objectContaining({ username: 'ana.lima', nickname: 'Aninha' })),
    );
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

  it('cria a conta com o nome e vai pôr o código, com o bilhete guardado neste navegador', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, { name: '  Ana Lima ' });

    await waitFor(() =>
      expect(signUpWithEmail).toHaveBeenCalledWith({
        name: 'Ana Lima',
        username: 'ana.lima',
        email: 'ana@example.com',
        cpf: '529.982.247-25',
        phone: '(81) 91234-5678',
        password: 'frevo2026',
      }),
    );
    expect(await screen.findByText('Tela do código do cadastro')).toBeInTheDocument();
    expect(readSignupTicket()).toEqual({ ticket: 't'.repeat(43), email: 'ana@example.com' });
  });

  it('o celular é opcional: sem ele, a conta é criada sem o campo', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText(/^celular/i)).not.toBeRequired();
    expect(screen.getByLabelText(/^celular/i).closest('div')).toHaveTextContent(/opcional/i);
    await fill(user, { phone: '' });

    await waitFor(() =>
      expect(signUpWithEmail).toHaveBeenCalledWith({
        name: 'Ana',
        username: 'ana.lima',
        email: 'ana@example.com',
        cpf: '529.982.247-25',
        password: 'frevo2026',
      }),
    );
  });

  it('não fala em link: o e-mail traz um código', () => {
    renderPage();

    expect(screen.queryByText(/link/i)).not.toBeInTheDocument();
    expect(screen.getByText(/código/i)).toBeInTheDocument();
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

    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });
});
