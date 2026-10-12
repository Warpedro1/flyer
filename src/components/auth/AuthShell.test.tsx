import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthShell } from './AuthShell.tsx';

describe('AuthShell', () => {
  it('tem scroll próprio (o body da app não faz scroll)', () => {
    render(
      <AuthShell title="Entrar">
        <p>conteúdo</p>
      </AuthShell>,
    );

    const scroller = screen.getByTestId('auth-scroll');
    expect(scroller).toHaveClass('overflow-y-auto');
    expect(scroller).toHaveClass('h-[100dvh]');
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
