import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar.tsx';

describe('Avatar', () => {
  it('mostra a foto quando existe', () => {
    const { container } = render(<Avatar url="https://storage.example/p.webp" label="Aninha" />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://storage.example/p.webp');
  });

  it('mostra as iniciais sem foto', () => {
    render(<Avatar url={null} label="Aninha do Frevo" />);

    expect(screen.getByText('AD')).toBeInTheDocument();
  });

  it('volta às iniciais quando a foto não carrega', () => {
    const { container } = render(<Avatar url="https://storage.example/p.webp" label="@ana.lima" />);

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });
});
