import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventCapacityRead, EventRead } from '../types/index.ts';

import { apiResponseError } from '../test/axiosErrors.ts';
import { makeEvent, makePlace } from '../test/factories.ts';

import EventDetailsPage from './EventDetailsPage.tsx';

const getEventById = vi.hoisted(() => vi.fn());
const checkIn = vi.hoisted(() => vi.fn());
const joinEvent = vi.hoisted(() => vi.fn());
const leaveEvent = vi.hoisted(() => vi.fn());
const getPlaceEvents = vi.hoisted(() => vi.fn());
const openCheckin = vi.hoisted(() => vi.fn());
const closeCheckin = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({
  getEventById,
  checkIn,
  joinEvent,
  leaveEvent,
  getPlaceEvents,
  openCheckin,
  closeCheckin,
}));
vi.mock('../hooks/useEffectiveGeo.ts', () => ({
  useEffectiveGeo: () => ({
    latitude: 38.7,
    longitude: -9.1,
    isEstimatedPosition: false,
  }),
}));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

function event(capacityState: EventCapacityRead | null, overrides: Partial<EventRead> = {}): EventRead {
  return {
    id: 'evt-1',
    kind: 'event',
    place_id: null,
    creator_id: 'someone-else',
    title: 'Jam session',
    description: null,
    category: null,
    location_name: 'Lisboa',
    lat: 38.7,
    long: -9.1,
    event_date: null,
    price: null,
    rating: null,
    attendee_count: 0,
    capacity: capacityState?.capacity ?? null,
    waitlist_enabled: true,
    call_ttl_minutes: 10,
    capacity_state: capacityState,
    is_boosted: false,
    boost_expires_at: null,
    created_at: null,
    media: [],
    opening_hours: null,
    price_level: null,
    source_url: null,
    cover_url: null,
    ends_at: null,
    checkin_opens_at: null,
    checkin_closes_at: null,
    checkin_status: 'open',
    ...overrides,
  };
}

function state(overrides: Partial<EventCapacityRead> = {}): EventCapacityRead {
  return {
    capacity: 50,
    taken: 12,
    waitlist_count: 0,
    my_status: null,
    my_waitlist_position: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/events/evt-1']}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EventDetailsPage — lotação e lista de espera', () => {
  beforeEach(() => {
    getEventById.mockReset();
    joinEvent.mockReset();
    leaveEvent.mockReset();
    checkIn.mockReset();
  });

  it('num evento sem limite não mostra vagas nem lista de espera', async () => {
    getEventById.mockResolvedValue(event(state({ capacity: null, taken: 9 })));

    renderPage();

    expect(await screen.findByRole('button', { name: /^vou$/i })).toBeInTheDocument();
    expect(screen.queryByText(/vagas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lista de espera/i)).not.toBeInTheDocument();
  });

  it('mostra as vagas ocupadas quando o evento tem lotação', async () => {
    getEventById.mockResolvedValue(event(state({ capacity: 50, taken: 12 })));

    renderPage();

    expect(await screen.findByText(/12 de 50 vagas/i)).toBeInTheDocument();
  });

  it('oferece a lista de espera quando a lotação está cheia', async () => {
    getEventById.mockResolvedValue(event(state({ capacity: 50, taken: 50 })));

    renderPage();

    expect(
      await screen.findByRole('button', { name: /entrar na lista de espera/i }),
    ).toBeInTheDocument();
  });

  it('mostra a posição de quem está na fila', async () => {
    getEventById.mockResolvedValue(
      event(state({ taken: 50, my_status: 'waitlisted', my_waitlist_position: 3 })),
    );

    renderPage();

    expect(await screen.findByText(/você é o 3º da lista/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sair da lista/i })).toBeInTheDocument();
  });

  it('avisa quem foi chamado', async () => {
    getEventById.mockResolvedValue(event(state({ my_status: 'called' })));

    renderPage();

    expect(await screen.findByText(/é a sua vez/i)).toBeInTheDocument();
  });

  it('leva quem tem vaga ao bilhete', async () => {
    getEventById.mockResolvedValue(event(state({ my_status: 'confirmed' })));

    renderPage();

    const link = await screen.findByRole('link', { name: /ver meu ingresso/i });
    expect(link).toHaveAttribute('href', '/events/evt-1/ticket');
  });

  it('o link do bilhete ocupa a largura toda, como o botão de check-in', async () => {
    // Um <a> é inline: sem `block`, o w-full e o py-4 não ocupam espaço e o link
    // fica estreito e encostado ao botão de baixo.
    getEventById.mockResolvedValue(event(state({ my_status: 'confirmed' })));

    renderPage();

    const link = await screen.findByRole('link', { name: /ver meu ingresso/i });
    expect(link).toHaveClass('block', 'w-full');
  });

  it('deixa quem não apareceu voltar para a fila', async () => {
    getEventById.mockResolvedValue(event(state({ taken: 50, my_status: 'no_show' })));

    renderPage();

    expect(await screen.findByText(/sua chamada expirou/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entrar na lista de espera/i }),
    ).toBeInTheDocument();
  });

  it('só mostra a gestão de participantes ao criador', async () => {
    getEventById.mockResolvedValue(
      event(state(), { creator_id: 'user-1' }),
    );

    renderPage();

    const link = await screen.findByRole('link', { name: /gerenciar participantes/i });
    expect(link).toHaveAttribute('href', '/events/evt-1/attendees');
  });

  it('não mostra a gestão de participantes a quem não criou o evento', async () => {
    getEventById.mockResolvedValue(event(state()));

    renderPage();

    await screen.findByRole('button', { name: /^vou$/i });
    expect(screen.queryByRole('link', { name: /gerenciar participantes/i })).toBeNull();
  });

  it('confirma presença e recarrega o estado do evento', async () => {
    const user = userEvent.setup();
    getEventById
      .mockResolvedValueOnce(event(state()))
      .mockResolvedValueOnce(event(state({ taken: 13, my_status: 'confirmed' })));
    joinEvent.mockResolvedValue({ status: 'confirmed' });

    renderPage();

    await user.click(await screen.findByRole('button', { name: /^vou$/i }));

    await waitFor(() => expect(joinEvent).toHaveBeenCalledWith('evt-1'));
    expect(await screen.findByRole('link', { name: /ver meu ingresso/i })).toBeInTheDocument();
  });

  it('mostra o erro quando o evento esgota entre o ecrã e o clique', async () => {
    const user = userEvent.setup();
    getEventById.mockResolvedValue(event(state({ capacity: 1, taken: 0 })));
    joinEvent.mockRejectedValue(new Error('Evento esgotado.'));

    renderPage();

    await user.click(await screen.findByRole('button', { name: /^vou$/i }));

    expect(await screen.findByText(/evento esgotado/i)).toBeInTheDocument();
  });
});

describe('EventDetailsPage — navegação', () => {
  beforeEach(() => {
    getEventById.mockReset();
    getPlaceEvents.mockReset().mockResolvedValue([]);
  });

  it('tem um botão "Voltar" com texto, numa barra que fica no topo ao fazer scroll', async () => {
    getEventById.mockResolvedValue(makeEvent());

    renderPage();

    const back = await screen.findByRole('button', { name: /voltar/i });
    expect(back).toHaveTextContent('Voltar');
    expect(back.closest('[data-testid="event-topbar"]')).toHaveClass('sticky');
  });

  it('a barra dos botões fica no fluxo da página e não tapa o fim do conteúdo', async () => {
    // Com position: fixed, o fim da página (ex.: o troféu ganho) ficava por baixo dos
    // botões "Vou" e "Check-in" no telemóvel. Sticky ocupa o seu espaço no fim.
    getEventById.mockResolvedValue(makeEvent());

    renderPage();

    const checkInButton = await screen.findByRole('button', { name: /check-in no evento/i });
    const bar = checkInButton.closest('[data-testid="event-actions"]');
    expect(bar).toHaveClass('sticky');
    expect(bar).not.toHaveClass('fixed');
  });
});

describe('EventDetailsPage — lugares', () => {
  beforeEach(() => {
    getEventById.mockReset();
    getPlaceEvents.mockReset().mockResolvedValue([]);
    joinEvent.mockReset();
  });

  it('um lugar mostra os horários e o link para a fonte, sem inscrição', async () => {
    getEventById.mockResolvedValue(makePlace({ id: 'evt-1' }));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Horários' })).toBeInTheDocument();
    expect(screen.getByText('segunda-feira')).toBeInTheDocument();
    expect(screen.getAllByText('11:30 a 22:00')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /ver no google maps/i })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/place/parraxaxa',
    );
    expect(screen.queryByRole('button', { name: /^vou$/i })).toBeNull();
    expect(screen.getByText('$$')).toBeInTheDocument();
  });

  it('um lugar lista os próximos eventos que acontecem lá', async () => {
    getEventById.mockResolvedValue(makePlace({ id: 'evt-1' }));
    getPlaceEvents.mockResolvedValue([
      makeEvent({ id: 'evt-9', title: 'Forró no Parraxaxá', event_date: '2026-10-17T23:00:00Z' }),
    ]);

    renderPage();

    expect(await screen.findByRole('heading', { name: /próximos eventos aqui/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /forró no parraxaxá/i })).toHaveAttribute(
      'href',
      '/events/evt-9',
    );
    expect(getPlaceEvents).toHaveBeenCalledWith('evt-1');
  });

  it('um evento num lugar leva ao lugar', async () => {
    getEventById.mockResolvedValue(makeEvent({ place_id: 'place-1' }));

    renderPage();

    expect(await screen.findByRole('link', { name: /ver o lugar/i })).toHaveAttribute(
      'href',
      '/events/place-1',
    );
    expect(getPlaceEvents).not.toHaveBeenCalled();
  });

  it('um evento importado sem preço não se mostra como grátis', async () => {
    getEventById.mockResolvedValue(
      makeEvent({ price: null, source_url: 'https://www.sympla.com.br/evento/x/1' }),
    );

    renderPage();

    expect(await screen.findByText('Preço a confirmar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver na sympla/i })).toHaveAttribute(
      'href',
      'https://www.sympla.com.br/evento/x/1',
    );
  });
});


describe('EventDetailsPage — troféu do check-in', () => {
  beforeEach(() => {
    getEventById.mockReset().mockResolvedValue(event(null));
    checkIn.mockReset();
  });

  it('mostra o troféu ganho com o ícone que o criador escolheu', async () => {
    const user = userEvent.setup();
    checkIn.mockResolvedValue({
      id: 'tr-1',
      template_id: 'tpl-1',
      name: 'Passista',
      description: 'Dançaste frevo',
      icon_url: 'https://signed/user-9/trofeu.png',
      acquired_at: '2026-10-12T20:00:00Z',
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: /check-in no evento/i }));

    expect(await screen.findByRole('img', { name: 'Passista' })).toHaveAttribute(
      'src',
      'https://signed/user-9/trofeu.png',
    );
    expect(screen.getByText('Dançaste frevo')).toBeInTheDocument();
  });
});

describe('EventDetailsPage — janela de check-in', () => {
  beforeEach(() => {
    getEventById.mockReset();
    getPlaceEvents.mockReset().mockResolvedValue([]);
    checkIn.mockReset();
    openCheckin.mockReset();
    closeCheckin.mockReset();
  });

  // Horas em UTC, como o backend devolve: 20:00 e 23:00 em Recife.
  const WINDOW = {
    event_date: '2026-10-16T23:00:00+00:00',
    ends_at: '2026-10-17T02:00:00+00:00',
    checkin_opens_at: '2026-10-16T23:00:00+00:00',
    checkin_closes_at: '2026-10-17T02:00:00+00:00',
  };

  it('antes de abrir diz quando abre e não deixa fazer check-in', async () => {
    getEventById.mockResolvedValue(event(null, { ...WINDOW, checkin_status: 'not_yet' }));

    renderPage();

    expect(await screen.findByText(/check-in abre às 20:00 de 16\/10/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check-in no evento/i })).toBeDisabled();
  });

  it('aberto diz até quando', async () => {
    getEventById.mockResolvedValue(event(null, { ...WINDOW, checkin_status: 'open' }));

    renderPage();

    expect(await screen.findByText(/check-in aberto até à?s 23:00/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check-in no evento/i })).toBeEnabled();
  });

  it('fechado não deixa fazer check-in', async () => {
    getEventById.mockResolvedValue(event(null, { ...WINDOW, checkin_status: 'closed' }));

    renderPage();

    expect(await screen.findByText(/check-in fechado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check-in no evento/i })).toBeDisabled();
  });

  it('um lugar fechado diz que o check-in é no horário de funcionamento', async () => {
    getEventById.mockResolvedValue(makePlace({ id: 'evt-1', checkin_status: 'closed' }));

    renderPage();

    expect(await screen.findByText(/horário de funcionamento/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check-in no lugar/i })).toBeDisabled();
  });

  it('o dono abre o check-in antes da hora', async () => {
    const user = userEvent.setup();
    getEventById
      .mockResolvedValueOnce(event(null, { ...WINDOW, creator_id: 'user-1', checkin_status: 'not_yet' }))
      .mockResolvedValueOnce(event(null, { ...WINDOW, creator_id: 'user-1', checkin_status: 'open' }));
    openCheckin.mockResolvedValue({});

    renderPage();
    await user.click(await screen.findByRole('button', { name: /abrir check-in agora/i }));

    await waitFor(() => expect(openCheckin).toHaveBeenCalledWith('evt-1'));
    expect(await screen.findByRole('button', { name: /fechar check-in/i })).toBeInTheDocument();
  });

  it('o dono fecha o check-in', async () => {
    const user = userEvent.setup();
    getEventById
      .mockResolvedValueOnce(event(null, { ...WINDOW, creator_id: 'user-1', checkin_status: 'open' }))
      .mockResolvedValueOnce(event(null, { ...WINDOW, creator_id: 'user-1', checkin_status: 'closed' }));
    closeCheckin.mockResolvedValue({});

    renderPage();
    await user.click(await screen.findByRole('button', { name: /fechar check-in/i }));

    await waitFor(() => expect(closeCheckin).toHaveBeenCalledWith('evt-1'));
    expect(await screen.findByText(/check-in fechado/i)).toBeInTheDocument();
  });

  it('o dono pode editar o evento', async () => {
    getEventById.mockResolvedValue(event(null, { ...WINDOW, creator_id: 'user-1' }));

    renderPage();

    expect(await screen.findByRole('link', { name: /editar evento/i })).toHaveAttribute(
      'href',
      '/events/evt-1/edit',
    );
  });

  it('quem não é dono não vê editar nem abrir/fechar', async () => {
    getEventById.mockResolvedValue(event(null, { ...WINDOW, creator_id: 'outra', checkin_status: 'not_yet' }));

    renderPage();
    await screen.findByText(/check-in abre/i);

    expect(screen.queryByRole('link', { name: /editar evento/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /abrir check-in agora/i })).toBeNull();
  });

  it('um evento importado não se edita', async () => {
    getEventById.mockResolvedValue(
      event(null, { ...WINDOW, creator_id: 'user-1', source_url: 'https://www.sympla.com.br/evento/x' }),
    );

    renderPage();
    await screen.findByText(/check-in aberto/i);

    expect(screen.queryByRole('link', { name: /editar evento/i })).toBeNull();
  });
});


describe('EventDetailsPage — evento que não existe (#33)', () => {
  beforeEach(() => {
    getEventById.mockReset();
    getPlaceEvents.mockReset().mockResolvedValue([]);
  });

  it('um 404 da API mostra a página "não encontrámos"', async () => {
    getEventById.mockRejectedValue(apiResponseError(404, { detail: 'Evento não encontrado.' }));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Não encontramos este evento' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toBeInTheDocument();
  });

  it('outro erro continua a mostrar a mensagem com o código', async () => {
    getEventById.mockRejectedValue(
      apiResponseError(500, { detail: 'Erro interno.', code: 'internal_error', request_id: 'abc123def456' }),
    );

    renderPage();

    expect(await screen.findByText(/código: internal_error · ref abc123def456/)).toBeInTheDocument();
  });
});
