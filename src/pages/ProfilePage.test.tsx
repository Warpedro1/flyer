import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from './ProfilePage.tsx';

const getUserTrophies = vi.hoisted(() => vi.fn());
const getMyProfile = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ getUserTrophies, getMyProfile }));

const ME = {
  name: 'Ana Lima',
  username: 'ana.lima',
  username_change_available_at: null,
  nickname: 'Aninha',
  email: 'ana@example.com',
  cpf_masked: '***.982.247-**',
  phone_masked: '(81) 9****-5678',
  avatar_url: 'https://storage.example/eu.webp',
  complete: true,
};
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
    getMyProfile.mockReset().mockResolvedValue(ME);
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

  it('mostra a própria foto, o vulgo e o @usuário', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Aninha' })).toBeInTheDocument();
    expect(screen.getByText('@ana.lima')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://storage.example/eu.webp"]')).not.toBeNull();
    // CPF e celular ficam em "Meus dados".
    expect(screen.queryByText('***.982.247-**')).not.toBeInTheDocument();
  });

  it('sem vulgo, o @usuário vira o título', async () => {
    getMyProfile.mockResolvedValue({ ...ME, nickname: null, avatar_url: null });
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '@ana.lima' })).toBeInTheDocument();
  });

  it('leva a "Meus dados"', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/me" element={<p>Tela de Meus dados</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('link', { name: /meus dados/i }));

    expect(screen.getByText('Tela de Meus dados')).toBeInTheDocument();
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

  it('dá para ver a introdução de novo (Warpedro1/flyer#23)', async () => {
    const user = userEvent.setup();
    function Home() {
      const location = useLocation();
      return <p>Início {JSON.stringify(location.state)}</p>;
    }
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /ver introdução de novo/i }));

    expect(screen.getByText('Início {"replayIntro":true}')).toBeInTheDocument();
  });
});
