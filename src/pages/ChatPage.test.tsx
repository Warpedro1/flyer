import { StrictMode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@supabase/supabase-js';

import type { ChatMessageOut } from '../types/index.ts';
import { getQuestionMessage } from '../utils/chatGuide.ts';

import ChatPage from './ChatPage.tsx';

const getChatHistory = vi.hoisted(() => vi.fn());
const sendChatMessage = vi.hoisted(() => vi.fn());

const mockUseAuth = vi.hoisted(() =>
  vi.fn(() => ({
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      user_metadata: { full_name: 'Maria Silva' },
    } as unknown as User,
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  })),
);

vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../constants/chatUi.ts', () => ({
  SIMULATED_ONBOARDING_ASSISTANT_DELAY_MS: 30,
  MIN_CHAT_ASSISTANT_DISPLAY_MS: 30,
}));

vi.mock('../services/flyerApi.ts', () => ({
  getChatHistory,
  sendChatMessage,
}));

describe('ChatPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    getChatHistory.mockReset();
    sendChatMessage.mockReset();
    mockUseAuth.mockClear();
  });

  it('sob StrictMode (double-invoke), encerra o carregamento mesmo sem histórico', async () => {
    getChatHistory.mockResolvedValue([]);

    render(
      <StrictMode>
        <ChatPage />
      </StrictMode>,
    );

    // Não pode ficar preso no spinner de "Carregando histórico...".
    await waitFor(() => {
      expect(screen.queryByText('Carregando histórico...')).not.toBeInTheDocument();
    });
    expect(screen.getByText(getQuestionMessage(0))).toBeInTheDocument();
  });

  it('no onboarding, mostra a próxima pergunta do assistente só após o atraso simulado', async () => {
    const user = userEvent.setup();
    getChatHistory.mockResolvedValue([]);

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.queryByText('Carregando histórico...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(getQuestionMessage(0))).toBeInTheDocument();
    expect(screen.getByText(/Olá, Maria!/)).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: /sua mensagem para o assistente/i });
    await user.type(input, 'Leio e corro');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(screen.getByText('Leio e corro')).toBeInTheDocument();
    expect(screen.getByText(/pensando/i)).toBeInTheDocument();
    expect(screen.queryByText(getQuestionMessage(1))).not.toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText(getQuestionMessage(1))).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.queryByText(/pensando/i)).not.toBeInTheDocument();
  });

  it('no chat, mantém o indicador até cumprir o tempo mínimo após a API resolver', async () => {
    const user = userEvent.setup();
    const history: ChatMessageOut[] = [
      { role: 'user', content: 'ola', created_at: null },
      { role: 'assistant', content: 'olá de volta', created_at: null },
    ];
    getChatHistory.mockResolvedValue(history);

    let resolveSend!: (value: ChatMessageOut) => void;
    sendChatMessage.mockImplementation(
      () =>
        new Promise<ChatMessageOut>((resolve) => {
          resolveSend = resolve;
        }),
    );

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.queryByText('Carregando histórico...')).not.toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /sua mensagem para o assistente/i });
    await user.type(input, 'pergunta');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => expect(sendChatMessage).toHaveBeenCalled());

    resolveSend({ role: 'assistant', content: 'resposta da API', created_at: null });

    await waitFor(
      () => {
        expect(screen.getByText('resposta da API')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
