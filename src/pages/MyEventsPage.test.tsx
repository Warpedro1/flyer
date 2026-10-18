import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeEvent } from '../test/factories.ts';
import type { EventRead } from '../types/index.ts';

import MyEventsPage from './MyEventsPage.tsx';

const getMyEvents = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ getMyEvents }));
vi.mock('../hooks/useAuth.ts', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="/events" element={<MyEventsPage />} />
        <Route path="/events/:id/ticket" element={<p>Tela do ingresso</p>} />
        <Route path="/events/:id" element={<p>Tela do evento</p>} />
        <Route path="/" element={<p>Descobrir</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function going(id: string, status: NonNullable<EventRead['my_rsvp']>['status'], position: number | null = null) {
  return makeEvent({ id, title: `Evento ${id}`, my_rsvp: { status, waitlist_position: position } });
}

describe('MyEventsPage (Warpedro1/flyer-back#40)', () => {
  beforeEach(() => {
    getMyEvents.mockReset().mockResolvedValue([]);
  });

  it('começa em "Todos" e nos próximos', async () => {
    renderPage();

    await waitFor(() => expect(getMyEvents).toHaveBeenCalledWith({ role: 'all', when: 'upcoming', limit: 20, offset: 0 }));
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Próximos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/eventos que você criou ou em que vai/i)).toBeInTheDocument();
  });

  it('as abas e "Passados" mudam o pedido', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Vou' }));
    await waitFor(() => expect(getMyEvents).toHaveBeenLastCalledWith({ role: 'going', when: 'upcoming', limit: 20, offset: 0 }));
    await user.click(screen.getByRole('tab', { name: 'Criei' }));
    await waitFor(() => expect(getMyEvents).toHaveBeenLastCalledWith({ role: 'created', when: 'upcoming', limit: 20, offset: 0 }));
    await user.click(screen.getByRole('tab', { name: 'Passados' }));
    await waitFor(() => expect(getMyEvents).toHaveBeenLastCalledWith({ role: 'created', when: 'past', limit: 20, offset: 0 }));
  });

  it('mostra o estado de cada evento', async () => {
    getMyEvents.mockResolvedValue([
      going('a', 'confirmed'),
      going('b', 'waitlisted', 3),
      going('c', 'called'),
      going('d', 'admitted'),
      makeEvent({ id: 'e', title: 'Evento e', creator_id: 'user-1' }),
    ]);
    renderPage();

    expect(await screen.findByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('Na fila (3º)')).toBeInTheDocument();
    expect(screen.getByText('Sua vez!')).toBeInTheDocument();
    expect(screen.getByText('Entrou')).toBeInTheDocument();
    expect(screen.getByText('Criado por você')).toBeInTheDocument();
  });

  it('o atalho do ingresso só aparece para quem está confirmado ou foi chamado', async () => {
    const user = userEvent.setup();
    getMyEvents.mockResolvedValue([going('a', 'confirmed'), going('b', 'waitlisted', 2), going('c', 'called')]);
    renderPage();

    const buttons = await screen.findAllByRole('button', { name: 'Ver ingresso' });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]);
    expect(screen.getByText('Tela do ingresso')).toBeInTheDocument();
  });

  it('abrir o cartão leva ao evento', async () => {
    const user = userEvent.setup();
    getMyEvents.mockResolvedValue([going('a', 'confirmed')]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /evento a/i }));
    expect(screen.getByText('Tela do evento')).toBeInTheDocument();
  });

  it('"Carregar mais" pede a página seguinte', async () => {
    const user = userEvent.setup();
    const page = Array.from({ length: 20 }, (_, i) => going(`p${i}`, 'confirmed'));
    getMyEvents.mockResolvedValueOnce(page).mockResolvedValueOnce([going('last', 'confirmed')]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /carregar mais/i }));

    await waitFor(() => expect(getMyEvents).toHaveBeenLastCalledWith({ role: 'all', when: 'upcoming', limit: 20, offset: 20 }));
    expect(await screen.findByRole('button', { name: /evento last/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /carregar mais/i })).not.toBeInTheDocument();
  });

  it('cada aba tem o seu estado vazio', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/ainda não criou nem se inscreveu/i)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Vou' }));
    const empty = await screen.findByText(/você ainda não vai a nenhum evento/i);
    await user.click(within(empty.closest('div') ?? document.body).getByRole('link', { name: /descobrir/i }));
    expect(screen.getByText('Descobrir')).toBeInTheDocument();
  });

  it('nos passados, o vazio diz que não há eventos passados', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Passados' }));

    expect(await screen.findByText('Nenhum evento passado.')).toBeInTheDocument();
  });
});
