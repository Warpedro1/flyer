import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeEvent } from '../test/factories.ts';

import CheckInPage from './CheckInPage.tsx';

const checkIn = vi.hoisted(() => vi.fn());
const discoverEvents = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ checkIn, discoverEvents }));
vi.mock('../components/map/EventMap.tsx', () => ({ default: () => null }));
vi.mock('../hooks/useEffectiveGeo.ts', () => ({
  useEffectiveGeo: () => ({
    latitude: -8.06,
    longitude: -34.87,
    error: null,
    loading: false,
    refresh: vi.fn(),
    effectiveLat: -8.06,
    effectiveLng: -34.87,
    chooseFallback: vi.fn(),
    isEstimatedPosition: false,
  }),
}));

describe('CheckInPage', () => {
  beforeEach(() => {
    discoverEvents.mockReset().mockResolvedValue([makeEvent({ id: 'evt-1', title: 'Noite de frevo' })]);
    checkIn.mockReset();
  });

  it('mostra o troféu desbloqueado com o ícone que o criador escolheu', async () => {
    const user = userEvent.setup();
    checkIn.mockResolvedValue({
      id: 'tr-1',
      template_id: 'tpl-1',
      name: 'Passista',
      description: 'Dançaste frevo',
      icon_url: 'https://signed/user-9/trofeu.png',
      acquired_at: '2026-10-12T20:00:00Z',
    });

    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: /fazer check-in/i }));

    expect(await screen.findByRole('img', { name: 'Passista' })).toHaveAttribute(
      'src',
      'https://signed/user-9/trofeu.png',
    );
    expect(checkIn).toHaveBeenCalledWith({ event_id: 'evt-1', lat: -8.06, long: -34.87 });
    expect(screen.getByText('Dançaste frevo')).toBeInTheDocument();
  });
});
