import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeAccessToken } from '../../test/tokens.ts';

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

const getEmailCodeStatus = vi.hoisted(() => vi.fn());
vi.mock('../../services/flyerApi.ts', () => ({ getEmailCodeStatus }));

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

  it('a barra de navegação do telemóvel fica fora da área com scroll, logo abaixo dela', () => {
    // Se a barra estivesse dentro do <main>, ou posicionada por cima dele, mexia-se
    // com o scroll. Como irmã do <main> na mesma coluna, fica sempre no fundo.
    renderAppWithChild('outlet-stub');

    const main = screen.getByRole('main');
    const nav = screen.getByRole('navigation', { name: /navegação principal/i });

    expect(main.contains(nav)).toBe(false);
    expect(nav.parentElement).toBe(main.parentElement);
    expect(main.nextElementSibling).toBe(nav);
  });
});


describe('AppLayout — código do login por e-mail', () => {
  function withSession(methods: string[]) {
    mockUseAuth.mockReturnValue({
      user: testUser,
      session: { access_token: fakeAccessToken(methods) } as never,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
    });
  }

  function renderWithCodeRoute() {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>Início</p>} />
          </Route>
          <Route path="/login/code" element={<p>Ecrã do código</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    getEmailCodeStatus.mockReset();
  });

  it('quem entrou com a senha e não pôs o código vai para o código', async () => {
    withSession(['password']);
    getEmailCodeStatus.mockResolvedValue({ required: true, verified: false });

    renderWithCodeRoute();

    expect(await screen.findByText('Ecrã do código')).toBeInTheDocument();
  });

  it('com o código já posto, entra', async () => {
    withSession(['password']);
    getEmailCodeStatus.mockResolvedValue({ required: true, verified: true });

    renderWithCodeRoute();

    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('quem entrou com o Google nem pergunta', () => {
    withSession(['oauth']);

    renderWithCodeRoute();

    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(getEmailCodeStatus).not.toHaveBeenCalled();
  });
});
