import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UsernameHint } from './UsernameHint.tsx';

describe('UsernameHint', () => {
  it('a região que o leitor de tela anuncia já existe antes da resposta', () => {
    const { container } = render(<UsernameHint id="hint" check={null} onUse={vi.fn()} />);

    const region = container.querySelector('#hint');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('diz quando está disponível', () => {
    render(<UsernameHint id="hint" check={{ available: true, reason: null, suggestion: null }} onUse={vi.fn()} />);

    expect(screen.getByText('Disponível.')).toBeInTheDocument();
  });

  it('diz por que não pode e oferece a sugestão', async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    render(<UsernameHint id="hint" check={{ available: false, reason: 'taken', suggestion: 'ana.lima42' }} onUse={onUse} />);

    expect(screen.getByText(/já está em uso/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar @ana.lima42' }));

    expect(onUse).toHaveBeenCalledWith('ana.lima42');
  });
});
