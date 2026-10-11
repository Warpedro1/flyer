import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeEvent, makePlace } from '../../test/factories.ts';
import { PLACEHOLDER_IMAGE } from '../../utils/eventFormatters.ts';

import { EventFeedCard } from './EventFeedCard.tsx';

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\u00a0/g, ' ');

describe('EventFeedCard', () => {
  it('um lugar diz que é um lugar, mostra a categoria e o nível de preço', () => {
    render(<EventFeedCard event={makePlace()} />);

    expect(screen.getByText('Lugar')).toBeInTheDocument();
    expect(screen.getByText('Comida/Bebida')).toBeInTheDocument();
    expect(screen.getByText('$$')).toBeInTheDocument();
    expect(screen.queryByText(/grátis|a confirmar/i)).toBeNull();
  });

  it('um evento mostra o preço em reais', () => {
    const { container } = render(
      <EventFeedCard event={makeEvent({ title: 'Noite de frevo', category: 'musica_show', price: '40.00' })} />,
    );

    expect(screen.getByText('Evento')).toBeInTheDocument();
    expect(screen.getByText('Música/Show')).toBeInTheDocument();
    expect(text(container)).toContain('R$ 40,00');
  });

  it('usa a imagem da fonte sem enviar o referrer (o Google recusa alguns pedidos com referrer)', () => {
    const { container } = render(
      <EventFeedCard event={makePlace({ cover_url: 'https://lh3.googleusercontent.com/p/x' })} />,
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://lh3.googleusercontent.com/p/x');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    // O browser começa a descarregar quando recebe o src: a política tem de vir antes,
    // senão o 1.º pedido ainda leva o referrer (visto no Chromium).
    const html = img?.outerHTML ?? '';
    expect(html.indexOf('referrerpolicy=')).toBeLessThan(html.indexOf(' src='));
  });

  it('se a imagem falhar mostra a imagem de reserva em vez de um ícone partido', () => {
    const { container } = render(
      <EventFeedCard event={makePlace({ cover_url: 'https://img.invalida/x.jpg' })} />,
    );
    const img = container.querySelector('img');
    if (!img) throw new Error('sem imagem');

    fireEvent.error(img);

    expect(img.getAttribute('src')).toBe(PLACEHOLDER_IMAGE);
  });
});
