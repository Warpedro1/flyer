import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  };
}

function result(mode: DiscoverResult['mode']): DiscoverResult {
  return { events: [event('evt-1', 'Concerto no Tejo')], mode };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
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
});
