import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import App from '../App.tsx';

// A app inteira é importada; sem .env nos testes, os clientes ficam vazios.
vi.mock('../lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('../lib/apiClient.ts', () => ({ apiClient: {} }));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signInWithGoogle: vi.fn(), signOut: vi.fn() }),
}));

describe('NotFoundPage', () => {
  it('um endereço que não existe mostra a página 404 em vez de ir para o início', () => {
    render(
      <MemoryRouter initialEntries={['/isto-nao-existe']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Não encontramos esta página' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/');
  });

  it('"Voltar" regressa à página anterior', async () => {
    const user = userEvent.setup();
    const { default: NotFoundPage } = await import('./NotFoundPage.tsx');
    render(
      <MemoryRouter initialEntries={['/anterior', '/perdido']} initialIndex={1}>
        <Routes>
          <Route path="/anterior" element={<p>Página anterior</p>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /voltar/i }));

    expect(screen.getByText('Página anterior')).toBeInTheDocument();
  });
});
