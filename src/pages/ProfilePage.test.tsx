import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from './ProfilePage.tsx';

const getUserTrophies = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ getUserTrophies }));
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
});
