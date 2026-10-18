import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { INTRO_STEPS } from '../../constants/introSteps.ts';

import { IntroTour } from './IntroTour.tsx';

describe('IntroTour (Warpedro1/flyer#23)', () => {
  it('são 7 passos curtos, com Criar evento, e termina no Chat IA', () => {
    expect(INTRO_STEPS.map((s) => s.title)).toEqual([
      'Descobrir',
      'Mapa',
      'Criar evento',
      'Meus eventos',
      'Notificações',
      'Perfil',
      'Chat IA',
    ]);
  });

  it('é um diálogo acessível, com o passo atual e o total', () => {
    render(<IntroTour onFinish={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Descobrir' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('1 de 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
  });

  it('"Próximo" e "Voltar" navegam pelos passos', async () => {
    const user = userEvent.setup();
    render(<IntroTour onFinish={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('dialog', { name: 'Mapa' })).toBeInTheDocument();
    expect(screen.getByText('2 de 7')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('dialog', { name: 'Descobrir' })).toBeInTheDocument();
  });

  it('as setas também navegam', async () => {
    const user = userEvent.setup();
    render(<IntroTour onFinish={vi.fn()} />);

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('dialog', { name: 'Criar evento' })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('dialog', { name: 'Mapa' })).toBeInTheDocument();
  });

  it('"Pular" está sempre visível e termina o tour', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<IntroTour onFinish={onFinish} />);

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Pular' }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('Esc pula', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<IntroTour onFinish={onFinish} />);

    await user.keyboard('{Escape}');

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('o último passo fala do chat e termina com "Começar"', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<IntroTour onFinish={onFinish} />);

    for (let i = 0; i < 6; i += 1) await user.click(screen.getByRole('button', { name: 'Próximo' }));

    expect(screen.getByRole('dialog', { name: 'Chat IA' })).toBeInTheDocument();
    expect(screen.getByText(/recomendações sob medida/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximo' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('o foco não sai do balão', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Fora do tour</button>
        <IntroTour onFinish={vi.fn()} />
      </>,
    );

    for (let i = 0; i < 5; i += 1) await user.tab();

    expect(screen.getByRole('button', { name: 'Fora do tour' })).not.toHaveFocus();
  });

  it('sem o elemento na tela, o balão fica no centro e explica onde encontrar', () => {
    render(<IntroTour onFinish={vi.fn()} />);

    // No jsdom nada tem tamanho: todos os passos caem no balão centralizado.
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'center');
  });
});
