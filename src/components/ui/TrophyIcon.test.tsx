import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TrophyIcon } from './TrophyIcon.tsx';

describe('TrophyIcon', () => {
  it('mostra a imagem que o criador escolheu', () => {
    render(<TrophyIcon iconUrl="https://signed/user-1/trofeu.png" name="Aluno dedicado" />);

    expect(screen.getByRole('img', { name: 'Aluno dedicado' })).toHaveAttribute(
      'src',
      'https://signed/user-1/trofeu.png',
    );
  });

  it('sem imagem mostra o ícone do Flyer', () => {
    const { container } = render(<TrophyIcon iconUrl={null} name="Presença: Aula" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('se a imagem não carregar (URL assinado expirado) volta ao ícone do Flyer', () => {
    const { container } = render(<TrophyIcon iconUrl="https://signed/expirado.png" name="Frevo!" />);

    fireEvent.error(screen.getByRole('img', { name: 'Frevo!' }));

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
