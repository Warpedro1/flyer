import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppLayout from './AppLayout';

const testUser = {
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  created_at: '',
  app_metadata: {},
  user_metadata: {
    avatar_url: 'https://example.com/avatar.png',
  },
} as User;

const mockUseAuth = vi.hoisted(() =>
  vi.fn(() => ({
    user: testUser,
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  })),
);

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderAppWithChild(childText: string) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<p>{childText}</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  it('apresenta os links de navegação principais Descobrir, Chat IA e Perfil', () => {
    renderAppWithChild('outlet-stub');

    for (const name of ['Descobrir', 'Chat IA', 'Perfil'] as const) {
      const links = screen.getAllByRole('link', { name });
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it('renderiza o conteúdo da rota filha (Outlet) na área principal', () => {
    const childMarker = 'conteúdo-aninhado-único-para-outlet';
    renderAppWithChild(childMarker);
    expect(screen.getByText(childMarker)).toBeInTheDocument();
  });
});
