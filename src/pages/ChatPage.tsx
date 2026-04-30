import { Send } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { WingHeartLogo } from '../components/layout/WingHeartLogo.tsx';
import { getChatHistory, sendChatMessage } from '../services/flyerApi.ts';
import { formatApiError } from '../utils/apiError.ts';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await getChatHistory();
        if (cancelled) return;
        setLines(
          history.map((m) => ({
            id: crypto.randomUUID(),
            role: m.role,
            content: m.content,
          })),
        );
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userLine: ChatLine = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    setLines((prev) => [...prev, userLine]);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const reply = await sendChatMessage({ content: text });
      setLines((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: reply.role,
          content: reply.content,
        },
      ]);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 pb-28 pt-4 md:pb-8">
      <h1 className="text-2xl font-bold text-gray-900">Assistente Flyer</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pergunta sobre eventos e interesses — a resposta vem do backend (IA).
      </p>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          {error}
        </div>
      )}

      <div
        ref={scrollRef}
        className="mt-6 flex min-h-[280px] max-h-[50vh] flex-col gap-4 overflow-y-auto rounded-3xl border border-gray-100 bg-white p-4 shadow-sm"
      >
        {loadingHistory && (
          <div className="flex flex-col items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            <p className="mt-2 text-sm text-gray-500">A carregar histórico...</p>
          </div>
        )}
        {!loadingHistory && lines.length === 0 && (
          <p className="text-sm text-gray-500">
            Escreve uma mensagem para começar. Ex.: &quot;Sugere concertos de jazz perto de
            mim.&quot;
          </p>
        )}
        {lines.map((line) => (
          <div
            key={line.id}
            className={`flex gap-3 ${line.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {line.role === 'assistant' && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-500">
                <WingHeartLogo className="h-5 w-5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                line.role === 'user'
                  ? 'bg-red-600 text-white'
                  : 'border border-gray-100 bg-gray-50 text-gray-800'
              }`}
            >
              {line.content}
            </div>
          </div>
        ))}
        {sending && (
          <p className="text-sm text-gray-400">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-400" /> A
            pensar...
          </p>
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex gap-2">
        <input
          type="text"
          className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
          placeholder="Escreve a tua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          disabled={sending}
          aria-label="Mensagem para o assistente"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex shrink-0 items-center justify-center rounded-full bg-red-600 p-3 text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
