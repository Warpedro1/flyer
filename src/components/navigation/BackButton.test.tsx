import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { BackButton } from './BackButton.tsx';

function renderAt(entries: string[]) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/" element={<p>Início</p>} />
        <Route path="/events" element={<p>Lista de eventos</p>} />
        <Route path="/events/:id" element={<BackButton />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BackButton', () => {
  it('diz "Voltar" por extenso', () => {
    renderAt(['/events/evt-1']);

    expect(screen.getByRole('button', { name: /voltar/i })).toHaveTextContent('Voltar');
  });

  it('volta ao ecrã anterior', async () => {
    renderAt(['/events', '/events/evt-1']);

    await userEvent.setup().click(screen.getByRole('button', { name: /voltar/i }));

    expect(screen.getByText('Lista de eventos')).toBeInTheDocument();
  });

  it('aberto por um link direto (sem histórico), leva ao início', async () => {
    renderAt(['/events/evt-1']);

    await userEvent.setup().click(screen.getByRole('button', { name: /voltar/i }));

    expect(screen.getByText('Início')).toBeInTheDocument();
  });
});
