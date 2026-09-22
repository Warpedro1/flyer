import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '../mocks/server.ts';

import CreateEventPage from './CreateEventPage.tsx';

const createEvent = vi.hoisted(() => vi.fn());
const uploadEventMedia = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ createEvent }));
vi.mock('../services/storage.ts', () => ({ uploadEventMedia }));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

function mockGeocodeHit() {
  server.use(
    http.get(SEARCH_URL, () =>
      HttpResponse.json([{ lat: '38.72', lon: '-9.13', display_name: 'Lisboa, Portugal' }]),
    ),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateEventPage />
    </MemoryRouter>,
  );
}

describe('CreateEventPage (endereço → geocodificação)', () => {
  beforeEach(() => {
    createEvent.mockReset();
    uploadEventMedia.mockReset();
  });

  it('geocodifica o endereço e cria o evento com location_name + coords resolvidas', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();
    createEvent.mockResolvedValue({ id: 'e1' });

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Festa de jazz');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Festa de jazz',
        location_name: 'Lisboa, Portugal',
        lat: 38.72,
        long: -9.13,
      }),
    );
  });

  it('mostra confirmação ao clicar em "Verificar"', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();

    renderPage();

    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
    await user.click(screen.getByRole('button', { name: /verificar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lisboa, Portugal/)).toBeInTheDocument();
    });
  });

  it('não cria o evento quando o endereço não é encontrado', async () => {
    const user = userEvent.setup();
    server.use(http.get(SEARCH_URL, () => HttpResponse.json([])));

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Evento sem lugar');
    await user.type(screen.getByLabelText(/endereço/i), 'endereço inexistente zzz');
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => {
      expect(screen.getByText(/não encontrado/i)).toBeInTheDocument();
    });
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('envia a recorrência "count" ao criar um evento que se repete N vezes', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();
    createEvent.mockResolvedValue({ id: 'e1' });

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Aula semanal');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
    fireEvent.change(screen.getByLabelText(/data do evento/i), {
      target: { value: '2026-08-01T20:00' },
    });

    await user.click(screen.getByLabelText(/repetir n vezes/i));
    fireEvent.change(screen.getByLabelText(/número de repetições/i), { target: { value: '3' } });

    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_date: '2026-08-01T20:00',
        recurrence: { mode: 'count', every: 'week', occurrences: 3 },
      }),
    );
  });

  it('faz upload do arquivo e envia o path da mídia ao criar o evento', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();
    uploadEventMedia.mockResolvedValue({ path: 'user-1/abc.png', type: 'image' });
    createEvent.mockResolvedValue({ id: 'e1' });

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Com imagem');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');

    const file = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/arraste arquivos/i), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('Enviado')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        media: [expect.objectContaining({ media_url: 'user-1/abc.png', type: 'image', order_index: 0 })],
      }),
    );
  });
});

describe('CreateEventPage (lotação e lista de espera)', () => {
  beforeEach(() => {
    createEvent.mockReset();
    uploadEventMedia.mockReset();
  });

  it('cria um evento sem limite de pessoas por omissão', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();
    createEvent.mockResolvedValue({ id: 'e1' });

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Sarau aberto');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ capacity: null }),
    );
  });

  it('esconde as opções de fila enquanto não houver limite', () => {
    renderPage();

    expect(screen.queryByLabelText(/número máximo de pessoas/i)).toBeNull();
    expect(screen.queryByLabelText(/minutos para aparecer/i)).toBeNull();
  });

  it('envia a lotação e as regras da fila quando o limite é ligado', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();
    createEvent.mockResolvedValue({ id: 'e1' });

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Workshop de 20');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
    await user.click(screen.getByLabelText(/limitar número de pessoas/i));

    fireEvent.change(screen.getByLabelText(/número máximo de pessoas/i), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(/minutos para aparecer/i), {
      target: { value: '15' },
    });

    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        capacity: 20,
        waitlist_enabled: true,
        call_ttl_minutes: 15,
        auto_call_next: true,
      }),
    );
  });

  it('sem lista de espera não pergunta por prazos de chamada', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByLabelText(/limitar número de pessoas/i));
    expect(screen.getByLabelText(/minutos para aparecer/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/lista de espera quando encher/i));

    // Sem fila não há ninguém para chamar, logo não há prazo que faça sentido.
    expect(screen.queryByLabelText(/minutos para aparecer/i)).toBeNull();
  });
});
