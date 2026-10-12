import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '../mocks/server.ts';

import { makePlace } from '../test/factories.ts';

import CreateEventPage from './CreateEventPage.tsx';

const createEvent = vi.hoisted(() => vi.fn());
const uploadEventMedia = vi.hoisted(() => vi.fn());
const discoverEvents = vi.hoisted(() => vi.fn());
const uploadTrophyIcon = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => ({ createEvent, discoverEvents }));
// As constantes (formatos aceites) ficam reais; só os uploads são simulados.
vi.mock('../lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('../services/storage.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/storage.ts')>()),
  uploadEventMedia,
  uploadTrophyIcon,
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

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

function mockGeocodeHit() {
  server.use(
    http.get(SEARCH_URL, () =>
      HttpResponse.json([{ lat: '38.72', lon: '-9.13', display_name: 'Lisboa, Portugal' }]),
    ),
  );
}

/** Início e fim são obrigatórios (decisão 2026-10-12). */
function fillWhen(start = '2026-10-16T20:00', end = '2026-10-16T23:00') {
  fireEvent.change(screen.getByLabelText(/início do evento/i), { target: { value: start } });
  fireEvent.change(screen.getByLabelText(/fim do evento/i), { target: { value: end } });
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
    fillWhen();
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
    fillWhen();
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
    fillWhen('2026-08-01T20:00', '2026-08-01T22:00');

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

    fillWhen();
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
    fillWhen();
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

    fillWhen();
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

describe('CreateEventPage (categoria e lugar)', () => {
  beforeEach(() => {
    createEvent.mockReset().mockResolvedValue({ id: 'e1' });
    discoverEvents.mockReset();
  });

  it('a categoria escolhe-se da taxonomia e vai como slug', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Luau');
    await user.selectOptions(screen.getByLabelText(/categoria/i), 'Praia/Natureza');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ category: 'praia_natureza' }));
  });

  it('escolher um lugar do Flyer usa a morada e as coordenadas dele', async () => {
    const user = userEvent.setup();
    discoverEvents.mockResolvedValue([makePlace()]);

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Noite de forró');
    await user.type(screen.getByLabelText(/lugar do flyer/i), 'parra');
    await user.click(await screen.findByRole('button', { name: /parraxaxá/i }));
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        place_id: 'place-1',
        location_name: 'Av. Fernando Simões Barbosa, 1200 - Boa Viagem',
        lat: -8.06,
        long: -34.87,
      }),
    );
    expect(discoverEvents).toHaveBeenCalledWith(expect.objectContaining({ kinds: ['place'] }));
  });

  it('sem lugar escolhido não manda place_id', async () => {
    const user = userEvent.setup();
    mockGeocodeHit();

    renderPage();

    await user.type(screen.getByLabelText(/título/i), 'Festa');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0][0].place_id ?? null).toBeNull();
  });
});


describe('CreateEventPage (troféu do check-in)', () => {
  const createObjectURL = vi.fn(() => 'blob:preview-1');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    createEvent.mockReset().mockResolvedValue({ id: 'e1' });
    uploadTrophyIcon.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    // O jsdom não tem estas duas funções.
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    mockGeocodeHit();
  });

  async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^título/i), 'Aula de frevo');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
  }

  const icon = () => new File([new Uint8Array([1])], 'trofeu.png', { type: 'image/png' });

  it('envia o nome, a descrição e o ícone personalizados', async () => {
    const user = userEvent.setup();
    uploadTrophyIcon.mockResolvedValue('user-1/trofeu.png');

    renderPage();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/nome do troféu/i), 'Passista');
    await user.type(screen.getByLabelText(/descrição do troféu/i), 'Dançaste frevo');
    await user.upload(screen.getByLabelText(/ícone do troféu/i), icon());
    await screen.findByRole('img', { name: /pré-visualização do ícone/i });
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(uploadTrophyIcon).toHaveBeenCalledWith('user-1', expect.any(File));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        trophy: { name: 'Passista', description: 'Dançaste frevo', icon_url: 'user-1/trofeu.png' },
      }),
    );
  });

  it('só com o ícone, o nome e a descrição ficam por omissão', async () => {
    const user = userEvent.setup();
    uploadTrophyIcon.mockResolvedValue('user-1/trofeu.png');

    renderPage();
    await fillRequired(user);
    await user.upload(screen.getByLabelText(/ícone do troféu/i), icon());
    await screen.findByRole('img', { name: /pré-visualização do ícone/i });
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0][0].trophy).toEqual({
      name: null,
      description: null,
      icon_url: 'user-1/trofeu.png',
    });
  });

  it('sem nada preenchido não manda troféu (o backend dá o troféu padrão)', async () => {
    const user = userEvent.setup();

    renderPage();
    await fillRequired(user);
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0][0].trophy ?? null).toBeNull();
  });

  it('diz que o troféu padrão é "Presença: <título>"', () => {
    renderPage();

    expect(screen.getByText(/presença: <título do evento>/i)).toBeInTheDocument();
  });

  it('mostra o erro do upload e não manda o ícone', async () => {
    const user = userEvent.setup();
    uploadTrophyIcon.mockRejectedValue(new Error('O ícone tem de ser uma imagem PNG, JPG, WebP ou GIF.'));

    renderPage();
    await fillRequired(user);
    await user.upload(screen.getByLabelText(/ícone do troféu/i), icon());

    expect(await screen.findByText(/o ícone tem de ser uma imagem/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /pré-visualização do ícone/i })).toBeNull();
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));
    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0][0].trophy ?? null).toBeNull();
  });

  it('não deixa criar o evento enquanto o ícone está a ser enviado', async () => {
    const user = userEvent.setup();
    uploadTrophyIcon.mockReturnValue(new Promise(() => {}));

    renderPage();
    await fillRequired(user);
    await user.upload(screen.getByLabelText(/ícone do troféu/i), icon());

    expect(await screen.findByText(/a enviar o ícone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar evento/i })).toBeDisabled();
  });

  it('remover o ícone volta ao ícone do Flyer e liberta a pré-visualização', async () => {
    const user = userEvent.setup();
    uploadTrophyIcon.mockResolvedValue('user-1/trofeu.png');

    renderPage();
    await fillRequired(user);
    await user.upload(screen.getByLabelText(/ícone do troféu/i), icon());
    await screen.findByRole('img', { name: /pré-visualização do ícone/i });
    await user.click(screen.getByRole('button', { name: /remover ícone/i }));

    expect(screen.queryByRole('img', { name: /pré-visualização do ícone/i })).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    fillWhen();
    await user.click(screen.getByRole('button', { name: /criar evento/i }));
    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0][0].trophy ?? null).toBeNull();
  });

  it('o seletor do ícone só aceita os formatos que o backend aceita', () => {
    renderPage();

    expect(screen.getByLabelText(/ícone do troféu/i)).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/webp,image/gif',
    );
  });
});

describe('CreateEventPage (início, fim e abertura do check-in)', () => {
  beforeEach(() => {
    createEvent.mockReset().mockResolvedValue({ id: 'e1' });
    mockGeocodeHit();
  });

  async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^título/i), 'Aula de frevo');
    await user.type(screen.getByLabelText(/endereço/i), 'Lisboa');
  }

  it('envia o início e o fim como hora de Recife, sem fuso', async () => {
    const user = userEvent.setup();

    renderPage();
    await fillRequired(user);
    fillWhen('2026-10-16T20:00', '2026-10-16T23:00');
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_date: '2026-10-16T20:00',
        ends_at: '2026-10-16T23:00',
        checkin_opens_at: null,
      }),
    );
  });

  it('o início e o fim são obrigatórios', () => {
    renderPage();

    expect(screen.getByLabelText(/início do evento/i)).toBeRequired();
    expect(screen.getByLabelText(/fim do evento/i)).toBeRequired();
  });

  it('não cria se o fim não for depois do início', async () => {
    const user = userEvent.setup();

    renderPage();
    await fillRequired(user);
    fillWhen('2026-10-16T20:00', '2026-10-16T19:00');
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    expect(await screen.findByText(/o fim tem de ser depois do início/i)).toBeInTheDocument();
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('a abertura do check-in pode ser programada', async () => {
    const user = userEvent.setup();

    renderPage();
    await fillRequired(user);
    fillWhen('2026-10-16T20:00', '2026-10-16T23:00');
    fireEvent.change(screen.getByLabelText(/abrir check-in/i), { target: { value: '2026-10-16T19:30' } });
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ checkin_opens_at: '2026-10-16T19:30' }));
  });

  it('o check-in tem de abrir antes do fim', async () => {
    const user = userEvent.setup();

    renderPage();
    await fillRequired(user);
    fillWhen('2026-10-16T20:00', '2026-10-16T23:00');
    fireEvent.change(screen.getByLabelText(/abrir check-in/i), { target: { value: '2026-10-16T23:30' } });
    await user.click(screen.getByRole('button', { name: /criar evento/i }));

    expect(await screen.findByText(/o check-in tem de abrir antes do fim/i)).toBeInTheDocument();
    expect(createEvent).not.toHaveBeenCalled();
  });
});

describe('CreateEventPage (sair durante o envio do ícone)', () => {
  it('não cria a pré-visualização depois de a página fechar', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    let finish: (path: string) => void = () => {};
    uploadTrophyIcon.mockReset().mockReturnValue(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();

    const { unmount } = renderPage();
    await user.upload(
      screen.getByLabelText(/ícone do troféu/i),
      new File([new Uint8Array([1])], 'trofeu.png', { type: 'image/png' }),
    );
    unmount();
    finish('user-1/trofeu.png');
    await Promise.resolve();

    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
