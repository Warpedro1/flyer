import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicIdentity } from './PublicIdentity.tsx';

describe('PublicIdentity', () => {
  it('o vulgo em cima e o @usuário embaixo, cada um na sua linha', () => {
    render(<PublicIdentity profile={{ username: 'ana.lima', nickname: 'Aninha' }} />);

    expect(screen.getByText('Aninha')).toBeInTheDocument();
    expect(screen.getByText('@ana.lima')).toBeInTheDocument();
  });

  it('só o @usuário quando não há vulgo', () => {
    const { container } = render(<PublicIdentity profile={{ username: 'bea', nickname: null }} />);

    expect(screen.getByText('@bea')).toBeInTheDocument();
    expect(container.textContent).toBe('@bea');
  });

  it('o texto padrão sem identidade', () => {
    render(<PublicIdentity profile={{ username: null, nickname: null }} fallback="Sem nome" />);

    expect(screen.getByText('Sem nome')).toBeInTheDocument();
  });
});
