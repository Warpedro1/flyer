import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from './ProfilePage.tsx';

const getUserTrophies = vi.hoisted(() => vi.fn());
const getProfileStatus = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ getUserTrophies, getProfileStatus }));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'ana@example.com', user_metadata: {} },
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut,
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    getUserTrophies.mockReset().mockResolvedValue([]);
    getProfileStatus
      .mockReset()
      .mockResolvedValue({ complete: true, cpf_masked: '***.982.247-**', phone_masked: '(81) 9****-5678' });
    signOut.mockReset().mockResolvedValue(undefined);
  });

  it('no telemóvel (sem a barra lateral) deixa terminar a sessão a partir do perfil', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /^sair$/i }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('mostra o CPF e o celular da própria conta, mascarados', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.getByText('(81) 9****-5678')).toBeInTheDocument();
  });

  it('sem celular, diz que não foi informado (Warpedro1/flyer-back#29)', async () => {
    getProfileStatus.mockResolvedValue({ complete: true, cpf_masked: '***.982.247-**', phone_masked: null });
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Não informado')).toBeInTheDocument();
  });

  it('o troféu leva ao evento de onde veio (Warpedro1/flyer-back#40)', async () => {
    getUserTrophies.mockResolvedValue([
      { id: 't1', template_id: 'tpl1', name: 'Presença: Frevo', description: null, icon_url: null, acquired_at: null, event_id: 'e1' },
      { id: 't2', template_id: 'tpl2', name: 'Troféu antigo', description: null, icon_url: null, acquired_at: null, event_id: null },
    ]);
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: 'Ver o evento de Presença: Frevo' });
    expect(link).toHaveAttribute('href', '/events/e1');
    expect(screen.getByText('Troféu antigo').closest('a')).toBeNull();
  });
});
