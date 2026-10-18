import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const getProfileStatus = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ complete: true, cpf_masked: null, phone_masked: null }),
);
const markIntroSeen = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../services/flyerApi.ts', () => ({ getEmailCodeStatus, getProfileStatus, markIntroSeen }));

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

  it('apresenta os links de navegação principais Descobrir, Chat IA e Perfil', async () => {
    renderAppWithChild('outlet-stub');
    // Primeiro confirma-se a conta (código do e-mail, CPF e celular) no backend.
    await screen.findByRole('main');

    for (const name of ['Descobrir', 'Chat IA', 'Perfil'] as const) {
      const links = screen.getAllByRole('link', { name });
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it('renderiza o conteúdo da rota filha (Outlet) na área principal', async () => {
    const childMarker = 'conteúdo-aninhado-único-para-outlet';
    renderAppWithChild(childMarker);
    expect(await screen.findByText(childMarker)).toBeInTheDocument();
  });

  it('a barra de navegação do telemóvel fica fora da área com scroll, logo abaixo dela', async () => {
    // Se a barra estivesse dentro do <main>, ou posicionada por cima dele, mexia-se
    // com o scroll. Como irmã do <main> na mesma coluna, fica sempre no fundo.
    renderAppWithChild('outlet-stub');

    const main = await screen.findByRole('main');
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
          <Route path="/login/code" element={<p>Tela do código</p>} />
          <Route path="/complete-profile" element={<p>Completar cadastro</p>} />
          <Route path="/signup/code" element={<p>Código do cadastro</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    getEmailCodeStatus.mockReset();
    // Um `Once` que um teste não chegou a usar (o código vem antes) não passa ao seguinte.
    getProfileStatus.mockReset().mockResolvedValue({ complete: true, cpf_masked: null, phone_masked: null });
  });

  it('quem entrou com a senha e não pôs o código vai para o código', async () => {
    withSession(['password']);
    getEmailCodeStatus.mockResolvedValue({ required: true, verified: false });

    renderWithCodeRoute();

    expect(await screen.findByText('Tela do código')).toBeInTheDocument();
  });

  it('com o código já posto, entra', async () => {
    withSession(['password']);
    getEmailCodeStatus.mockResolvedValue({ required: true, verified: true });

    renderWithCodeRoute();

    expect(await screen.findByText('Início')).toBeInTheDocument();
  });

  it('quem entrou com o Google não precisa do código', async () => {
    withSession(['oauth']);

    renderWithCodeRoute();

    expect(await screen.findByText('Início')).toBeInTheDocument();
    expect(getEmailCodeStatus).not.toHaveBeenCalled();
  });

  it('sem CPF e celular vai completar o cadastro', async () => {
    withSession(['oauth']);
    getProfileStatus.mockResolvedValueOnce({ complete: false, cpf_masked: null, phone_masked: null });

    renderWithCodeRoute();

    expect(await screen.findByText('Completar cadastro')).toBeInTheDocument();
  });

  it('o código vem antes do cadastro', async () => {
    withSession(['password']);
    getEmailCodeStatus.mockResolvedValue({ required: true, verified: false });
    getProfileStatus.mockResolvedValueOnce({ complete: false, cpf_masked: null, phone_masked: null });

    renderWithCodeRoute();

    expect(await screen.findByText('Tela do código')).toBeInTheDocument();
  });

  it('um cadastro sem o código posto vai pôr o código', async () => {
    withSession(['otp']);
    getProfileStatus.mockResolvedValueOnce({ complete: true, pending: true, cpf_masked: null, phone_masked: null });

    renderWithCodeRoute();

    expect(await screen.findByText('Código do cadastro')).toBeInTheDocument();
  });
});


describe('AppLayout — introdução do 1.º login (Warpedro1/flyer#23)', () => {
  const status = (intro: { intro_seen?: boolean; onboarded?: boolean }) => ({
    complete: true,
    cpf_masked: null,
    phone_masked: null,
    ...intro,
  });

  function renderAt(entry: string | { pathname: string; state: unknown } = '/') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>Início</p>} />
            <Route path="/chat" element={<p>Onboarding do chat</p>} />
            <Route path="/profile" element={<p>Tela do perfil</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: testUser,
      session: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
    });
    markIntroSeen.mockReset().mockResolvedValue(undefined);
  });

  it('no 1.º login, mostra a introdução depois das guardas da conta', async () => {
    getProfileStatus.mockResolvedValue(status({ intro_seen: false, onboarded: false }));

    renderAt();

    expect(await screen.findByRole('dialog', { name: 'Descobrir' })).toBeInTheDocument();
  });

  it('a introdução começa no Descobrir, mesmo que o 1.º acesso seja noutra página', async () => {
    getProfileStatus.mockResolvedValue(status({ intro_seen: false, onboarded: false }));

    renderAt('/profile');

    expect(await screen.findByRole('dialog', { name: 'Descobrir' })).toBeInTheDocument();
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('quem já viu (ou uma conta antiga) não vê de novo', async () => {
    getProfileStatus.mockResolvedValue(status({ intro_seen: true, onboarded: true }));

    renderAt();

    expect(await screen.findByText('Início')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pular grava e leva ao onboarding do chat', async () => {
    const user = userEvent.setup();
    getProfileStatus.mockResolvedValue(status({ intro_seen: false, onboarded: false }));
    renderAt();

    await user.click(await screen.findByRole('button', { name: 'Pular' }));

    expect(markIntroSeen).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Onboarding do chat')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('quem já fez o onboarding do chat fica na descoberta', async () => {
    const user = userEvent.setup();
    getProfileStatus.mockResolvedValue(status({ intro_seen: false, onboarded: true }));
    renderAt();

    await user.click(await screen.findByRole('button', { name: 'Pular' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('"Ver introdução de novo" mostra o tour sem gravar nada', async () => {
    const user = userEvent.setup();
    getProfileStatus.mockResolvedValue(status({ intro_seen: true, onboarded: true }));
    renderAt({ pathname: '/', state: { replayIntro: true } });

    await user.click(await screen.findByRole('button', { name: 'Pular' }));

    expect(markIntroSeen).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('se gravar falhar, o tour não volta nesta sessão e o app segue', async () => {
    const user = userEvent.setup();
    getProfileStatus.mockResolvedValue(status({ intro_seen: false, onboarded: false }));
    markIntroSeen.mockRejectedValue(new Error('rede'));
    renderAt();

    await user.click(await screen.findByRole('button', { name: 'Pular' }));

    expect(await screen.findByText('Onboarding do chat')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
