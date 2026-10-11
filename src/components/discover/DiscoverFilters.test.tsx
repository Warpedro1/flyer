import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_FILTERS } from '../../utils/discoverFilters.ts';

import { DiscoverFilters } from './DiscoverFilters.tsx';

function setup(filters = DEFAULT_FILTERS) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<DiscoverFilters filters={filters} onChange={onChange} />);
  return { onChange, user };
}

describe('DiscoverFilters', () => {
  it('o painel abre no botão Filtros', async () => {
    const { user } = setup();

    expect(screen.queryByRole('group', { name: 'Tipo' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /filtros/i }));

    for (const name of ['Tipo', 'Data', 'Distância', 'Valor', 'Categorias']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
  });

  it('escolher só lugares', async () => {
    const { user, onChange } = setup();

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    await user.click(screen.getByRole('button', { name: 'Lugares' }));

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, kind: 'place' });
  });

  it('as categorias acumulam e desmarcam', async () => {
    const { user, onChange } = setup({ ...DEFAULT_FILTERS, categories: ['jogos'] });

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    await user.click(screen.getByRole('button', { name: 'Praia/Natureza' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_FILTERS,
      categories: ['jogos', 'praia_natureza'],
    });

    await user.click(screen.getByRole('button', { name: 'Jogos' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, categories: [] });
  });

  it('data, distância e valor', async () => {
    const { user, onChange } = setup();

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    await user.click(screen.getByRole('button', { name: 'Fim de semana' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, date: 'weekend' });

    await user.click(screen.getByRole('button', { name: '5 km' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, radiusKm: 5 });

    await user.click(screen.getByRole('button', { name: 'Grátis' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FILTERS, maxPrice: 0 });
  });

  it('o botão mostra quantos filtros estão ativos e Limpar repõe tudo', async () => {
    const { user, onChange } = setup({ ...DEFAULT_FILTERS, kind: 'event', maxPrice: 50 });

    await user.click(screen.getByRole('button', { name: /filtros \(2\)/i }));
    await user.click(screen.getByRole('button', { name: /limpar/i }));

    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_FILTERS);
  });
});
