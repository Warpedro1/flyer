import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DiscoverResult, EventRead } from '../types/index.ts';

import DiscoverPage from './DiscoverPage.tsx';

const discoverEventsWithMode = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ discoverEventsWithMode }));
vi.mock('../hooks/useEffectiveGeo.ts', () => ({
  useEffectiveGeo: () => ({
    error: null,
    loading: false,
    refresh: vi.fn(),
    effectiveLat: 38.72,
    effectiveLng: -9.14,
    chooseFallback: vi.fn(),
    isEstimatedPosition: false,
  }),
}));

function event(id: string, title: string): EventRead {
  return {
    id,
    kind: 'event',
    place_id: null,
    creator_id: null,
    title,
    description: null,
    category: null,
    location_name: 'Lisboa',
    lat: 38.7,
    long: -9.1,
    event_date: null,
    price: null,
    rating: null,
    attendee_count: 0,
    capacity: null,
    waitlist_enabled: true,
    call_ttl_minutes: 10,
    capacity_state: null,
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
  };
}

function result(mode: DiscoverResult['mode']): DiscoverResult {
  return { events: [event('evt-1', 'Concerto no Tejo')], mode };
}

// O jsdom não tem IntersectionObserver. Este imita o do browser: ao começar a observar
// avisa logo com o estado atual (`sentinelVisible`), e guarda o callback para o teste
// simular o sentinela a entrar no ecrã.
type IoCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
const observers: IoCallback[] = [];
let sentinelVisible = false;
class FakeIntersectionObserver {
  private readonly callback: IoCallback;
  constructor(callback: IoCallback) {
    this.callback = callback;
    observers.push(callback);
  }
  observe(): void {
    const cb = this.callback;
    queueMicrotask(() => cb([{ isIntersecting: sentinelVisible }]));
  }
  unobserve(): void {}
  disconnect(): void {}
}

function page(from: number, count: number): EventRead[] {
  return Array.from({ length: count }, (_, i) => event(`evt-${from + i}`, `Evento ${from + i}`));
}

function renderPage(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/chat" element={<p>Página do Chat</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DiscoverPage', () => {
  beforeEach(() => {
    discoverEventsWithMode.mockReset();
    observers.length = 0;
    sentinelVisible = false;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra os eventos recomendados sem aviso quando a descoberta é personalizada', async () => {
    discoverEventsWithMode.mockResolvedValue(result('personalized'));

    renderPage();

    expect(await screen.findByText('Concerto no Tejo')).toBeInTheDocument();
    expect(screen.queryByText(/onboarding/i)).not.toBeInTheDocument();
  });

  it('sem perfil de interesses, mostra os eventos próximos e sugere o onboarding', async () => {
    discoverEventsWithMode.mockResolvedValue(result('nearby'));

    renderPage();

    expect(await screen.findByText('Concerto no Tejo')).toBeInTheDocument();
    expect(screen.getByText(/perto de ti, por data/i)).toBeInTheDocument();
  });

  it('o aviso leva ao Chat para fazer o onboarding', async () => {
    discoverEventsWithMode.mockResolvedValue(result('nearby'));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: /fazer o onboarding/i }));

    expect(screen.getByText('Página do Chat')).toBeInTheDocument();
  });

  it('carrega a página seguinte quando o fim da lista aparece no ecrã', async () => {
    // Quem faz scroll é o <main>, não a janela: um listener no window nunca dispara.
    const fullPage = Array.from({ length: 20 }, (_, i) => event(`evt-${i}`, `Evento ${i}`));
    discoverEventsWithMode
      .mockResolvedValueOnce({ events: fullPage, mode: 'personalized' })
      .mockResolvedValueOnce({ events: [event('evt-99', 'Último evento')], mode: 'personalized' });

    renderPage();
    await screen.findByText('Evento 0');

    act(() => {
      for (const cb of observers) cb([{ isIntersecting: true }]);
    });

    expect(await screen.findByText('Último evento')).toBeInTheDocument();
    expect(discoverEventsWithMode).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('os filtros do URL vão no pedido', async () => {
    discoverEventsWithMode.mockResolvedValue(result('personalized'));

    renderPage('/?tipo=place&cat=jogos&raio=5');

    await screen.findByText('Concerto no Tejo');
    expect(discoverEventsWithMode).toHaveBeenCalledWith(
      expect.objectContaining({ kinds: ['place'], categories: ['jogos'], radius_km: 5, page: 1 }),
    );
  });

  it('mudar um filtro volta a pedir a primeira página com o filtro', async () => {
    discoverEventsWithMode.mockResolvedValue(result('personalized'));
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Concerto no Tejo');
    await user.click(screen.getByRole('button', { name: /filtros/i }));
    await user.click(screen.getByRole('button', { name: 'Eventos' }));

    await waitFor(() =>
      expect(discoverEventsWithMode).toHaveBeenLastCalledWith(
        expect.objectContaining({ kinds: ['event'], page: 1 }),
      ),
    );
  });

  it('num ecrã largo, com o fim da lista sempre visível, continua a carregar as páginas seguintes', async () => {
    // A 1.ª página não chega para empurrar o sentinela para fora do ecrã: o observador
    // nunca vê uma mudança. Tem de voltar a olhar depois de cada página.
    sentinelVisible = true;
    discoverEventsWithMode
      .mockResolvedValueOnce({ events: page(0, 20), mode: 'personalized' })
      .mockResolvedValueOnce({ events: page(20, 5), mode: 'personalized' });

    renderPage();

    expect(await screen.findByText('Evento 24')).toBeInTheDocument();
    expect(discoverEventsWithMode).toHaveBeenCalledTimes(2);
    expect(discoverEventsWithMode).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('o botão "Carregar mais" pede a página seguinte', async () => {
    discoverEventsWithMode
      .mockResolvedValueOnce({ events: page(0, 20), mode: 'personalized' })
      .mockResolvedValueOnce({ events: page(20, 3), mode: 'personalized' });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: /carregar mais/i }));

    expect(await screen.findByText('Evento 22')).toBeInTheDocument();
    expect(discoverEventsWithMode).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('no fim da lista diz que não há mais e esconde o botão', async () => {
    discoverEventsWithMode.mockResolvedValueOnce({ events: page(0, 4), mode: 'personalized' });

    renderPage();

    expect(await screen.findByText(/não há mais/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /carregar mais/i })).toBeNull();
  });
});

