import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeEvent, makePlace } from '../../test/factories.ts';

import { EventFeedCard } from './EventFeedCard.tsx';

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\u00a0/g, ' ');

describe('EventFeedCard', () => {
  it('um lugar diz que é um lugar, mostra a categoria e o nível de preço', () => {
    render(<EventFeedCard event={makePlace()} />);

    expect(screen.getByText('Lugar')).toBeInTheDocument();
    expect(screen.getByText('Comida e bebida')).toBeInTheDocument();
    expect(screen.getByText('$$')).toBeInTheDocument();
    expect(screen.queryByText(/grátis|a confirmar/i)).toBeNull();
  });

  it('um evento mostra o preço em reais', () => {
    const { container } = render(
      <EventFeedCard event={makeEvent({ title: 'Noite de frevo', category: 'musica_show', price: '40.00' })} />,
    );

    expect(screen.getByText('Evento')).toBeInTheDocument();
    expect(screen.getByText('Música e shows')).toBeInTheDocument();
    expect(text(container)).toContain('R$ 40,00');
  });
});
