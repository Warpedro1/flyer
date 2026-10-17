import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeEvent, makePlace } from '../test/factories.ts';

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
    discoverEvents.mockReset().mockResolvedValue([makePlace({ id: 'evt-1', title: 'Parque da Jaqueira' })]);
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

describe('CheckInPage — janela de check-in', () => {
  beforeEach(() => {
    checkIn.mockReset();
  });

  it('um lugar fechado agora não deixa fazer check-in', async () => {
    discoverEvents.mockReset().mockResolvedValue([
      makePlace({ id: 'evt-2', title: 'Parraxaxá', checkin_status: 'closed' }),
    ]);

    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: /lugar fechado agora/i });
    expect(button).toBeDisabled();
  });
});

describe('CheckInPage — como cada evento faz check-in (2026-10-17)', () => {
  beforeEach(() => {
    checkIn.mockReset();
  });

  it('um evento do app leva ao ingresso, sem check-in por GPS', async () => {
    discoverEvents.mockReset().mockResolvedValue([makeEvent({ id: 'evt-3', title: 'Noite de frevo' })]);

    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: /mostrar ingresso na entrada/i });
    expect(link).toHaveAttribute('href', '/events/evt-3');
    expect(screen.queryByRole('button', { name: /fazer check-in/i })).not.toBeInTheDocument();
  });

  it('um evento importado não aparece: é só informativo', async () => {
    discoverEvents.mockReset().mockResolvedValue([
      makeEvent({ id: 'evt-4', title: 'Show da Sympla', checkin_method: 'none' }),
      makePlace({ id: 'evt-5', title: 'Parque da Jaqueira' }),
    ]);

    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Parque da Jaqueira')).toBeInTheDocument();
    expect(screen.queryByText('Show da Sympla')).not.toBeInTheDocument();
  });
});
