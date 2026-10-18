import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CompleteProfilePage from './CompleteProfilePage.tsx';

const completeProfileIdentity = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  value: { user: { id: 'user-1', email: 'gui@example.com' } as unknown, session: {}, loading: false, signOut: vi.fn() },
}));

vi.mock('../services/flyerApi.ts', () => ({ completeProfileIdentity }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => auth.value }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/complete-profile']}>
      <Routes>
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/" element={<p>Início</p>} />
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(user: ReturnType<typeof userEvent.setup>, cpf = '52998224725', phone = '81912345678') {
  await user.type(screen.getByLabelText(/^cpf/i), cpf);
  if (phone) await user.type(screen.getByLabelText(/^celular/i), phone);
  await user.click(screen.getByRole('button', { name: /continuar/i }));
}

describe('CompleteProfilePage', () => {
  beforeEach(() => {
    completeProfileIdentity.mockReset().mockResolvedValue(undefined);
    signOut.mockReset().mockResolvedValue(undefined);
    auth.value = { ...auth.value, user: { id: 'user-1', email: 'gui@example.com' }, signOut };
  });

  it('pede CPF e celular e entra na app', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user);

    await waitFor(() =>
      expect(completeProfileIdentity).toHaveBeenCalledWith({ cpf: '529.982.247-25', phone: '(81) 91234-5678' }),
    );
    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('basta o CPF: o celular é opcional (Warpedro1/flyer-back#29)', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText(/^celular/i)).not.toBeRequired();
    await fill(user, '52998224725', '');

    await waitFor(() => expect(completeProfileIdentity).toHaveBeenCalledWith({ cpf: '529.982.247-25' }));
    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('explica para que servem e que só a pessoa os vê', () => {
    renderPage();

    expect(screen.getByText(/só você vê/i)).toBeInTheDocument();
  });

  it('valida antes de enviar', async () => {
    const user = userEvent.setup();
    renderPage();

    await fill(user, '11111111111', '8131234567');

    expect(await screen.findByText('CPF inválido')).toBeInTheDocument();
    expect(completeProfileIdentity).not.toHaveBeenCalled();
  });

  it('diz quando o CPF já tem outra conta', async () => {
    const user = userEvent.setup();
    completeProfileIdentity.mockRejectedValue(new Error('Este CPF já tem uma conta.'));
    renderPage();

    await fill(user);

    expect(await screen.findByText('Este CPF já tem uma conta.')).toBeInTheDocument();
  });

  it('dá para sair e usar outra conta', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /usar outra conta/i }));

    expect(signOut).toHaveBeenCalled();
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  it('sem sessão volta ao login', () => {
    auth.value = { ...auth.value, user: null };

    renderPage();

    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });
});
