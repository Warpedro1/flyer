import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary.tsx';

const reportClientError = vi.hoisted(() => vi.fn());
const reloadOnce = vi.hoisted(() => vi.fn());
vi.mock('../../services/flyerApi.ts', () => ({ reportClientError }));
vi.mock('../../utils/chunkReload.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/chunkReload.ts')>()),
  reloadOnce,
}));

const crash = { on: true };

function Fragile() {
  if (crash.on) throw new TypeError("Cannot read properties of undefined (reading 'title')");
  return <p>Página carregada</p>;
}

function renderBoundary(child = <Fragile />) {
  return render(
    <MemoryRouter>
      <ErrorBoundary>{child}</ErrorBoundary>
    </MemoryRouter>,
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    crash.on = true;
    reportClientError.mockReset().mockResolvedValue(undefined);
    reloadOnce.mockReset().mockReturnValue(false);
    // O React escreve o erro na consola; aqui é esperado.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('um erro numa página mostra a tela de erro em vez de ficar em branco', () => {
    renderBoundary();

    expect(screen.getByRole('heading', { name: 'Algo correu mal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/');
  });

  it('mostra uma referência e envia o erro com ela', () => {
    renderBoundary();

    const ref = screen.getByText(/^ref /).textContent?.replace('ref ', '') ?? '';
    expect(ref).toMatch(/^[a-z0-9]{12}$/);
    expect(reportClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot read properties of undefined (reading 'title')",
        code: 'render_error',
        route: '/',
      }),
      ref,
    );
  });

  it('"Tentar de novo" volta a montar a página', async () => {
    const user = userEvent.setup();
    renderBoundary();

    crash.on = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(screen.getByText('Página carregada')).toBeInTheDocument();
  });

  it('um ficheiro que já não existe (deploy novo) recarrega a página uma vez', () => {
    reloadOnce.mockReturnValue(true);
    function OldChunk(): never {
      throw new TypeError('Failed to fetch dynamically imported module: /assets/ScanTicketPage-abc.js');
    }

    renderBoundary(<OldChunk />);

    expect(reloadOnce).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Algo correu mal' })).not.toBeInTheDocument();
    expect(reportClientError).not.toHaveBeenCalled();
  });

  it('se já recarregou há pouco, mostra a tela de erro', () => {
    function OldChunk(): never {
      throw new TypeError('Failed to fetch dynamically imported module: /assets/x.js');
    }

    renderBoundary(<OldChunk />);

    expect(screen.getByRole('heading', { name: 'Algo correu mal' })).toBeInTheDocument();
    expect(reportClientError).toHaveBeenCalledWith(expect.objectContaining({ code: 'chunk_load_error' }), expect.any(String));
  });

  it('sem erro, mostra os filhos', () => {
    function Fine() {
      const [n] = useState(1);
      return <p>ok {n}</p>;
    }

    renderBoundary(<Fine />);

    expect(screen.getByText('ok 1')).toBeInTheDocument();
  });
});
