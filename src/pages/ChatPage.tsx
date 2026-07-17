import axios from 'axios';
import { Send } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { WingHeartLogo } from '../components/layout/WingHeartLogo.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { completeOnboarding, getChatHistory, sendChatMessage } from '../services/flyerApi.ts';
import { formatApiError } from '../utils/apiError.ts';
import {
  MIN_CHAT_ASSISTANT_DISPLAY_MS,
  SIMULATED_ONBOARDING_ASSISTANT_DELAY_MS,
} from '../constants/chatUi.ts';
import {
  type GuideAnswers,
  GUIDE_STEPS,
  getFirstNameFromUserMetadata,
  getGuideClosingText,
  getGuideIntroMessage,
  getQuestionMessage,
  guideAnswersToCompletePayload,
  persistGuideCompletion,
  isGuideMarkedDoneInStorage,
} from '../utils/chatGuide.ts';

const ONBOARDING_USER_REJECTED_MSG =
  'Não consegui te ajudar com isso. Por favor, tente novamente.';
const ONBOARDING_SERVER_FAIL_MSG =
  'Estamos com um problema do nosso lado. Tenta de novo daqui a pouco.';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ChatPhase = 'loading' | 'onboarding' | 'chat';

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [phase, setPhase] = useState<ChatPhase>('loading');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [guideAnswers, setGuideAnswers] = useState<GuideAnswers>({});
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const didInitRef = useRef(false);
  const onboardingAssistantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOnboardingAssistantTimer = () => {
    if (onboardingAssistantTimerRef.current !== null) {
      clearTimeout(onboardingAssistantTimerRef.current);
      onboardingAssistantTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (authLoading) return;

    const startOnboarding = () => {
      const firstName = getFirstNameFromUserMetadata(
        user?.user_metadata as Record<string, unknown> | undefined,
      );
      setLines([
        { id: crypto.randomUUID(), role: 'assistant', content: getGuideIntroMessage(firstName) },
        { id: crypto.randomUUID(), role: 'assistant', content: getQuestionMessage(0) },
      ]);
      setPhase('onboarding');
      setOnboardingStep(0);
    };

    let cancelled = false;
    (async () => {
      try {
        const history = await getChatHistory();
        if (cancelled) return;
        // Initialize once (guard AFTER the await so StrictMode's discarded first
        // run doesn't consume it): a later re-run on user?.id hydration must not
        // rebuild the intro and wipe in-progress answers.
        if (didInitRef.current) return;
        didInitRef.current = true;
        if (history.length > 0) {
          setLines(
            history.map((m) => ({
              id: crypto.randomUUID(),
              role: m.role,
              content: m.content,
            })),
          );
          setPhase('chat');
        } else if (isGuideMarkedDoneInStorage()) {
          setLines([]);
          setPhase('chat');
        } else {
          startOnboarding();
        }
      } catch (err) {
        if (cancelled) return;
        setError(formatApiError(err));
        // A transient history error must not silently skip onboarding for a new
        // user: fall back to the storage flag to choose chat vs onboarding.
        if (!didInitRef.current) {
          didInitRef.current = true;
          if (isGuideMarkedDoneInStorage()) {
            setLines([]);
            setPhase('chat');
          } else {
            startOnboarding();
          }
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // user?.user_metadata is read for the intro name only; intentionally not a dep
    // so a later metadata update does not re-init and clobber in-progress answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearOnboardingAssistantTimer();
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [lines]);

  const completeLastOnboardingStep = useCallback(async (nextAnswers: GuideAnswers) => {
    try {
      const payload = guideAnswersToCompletePayload(nextAnswers);
      await completeOnboarding({ answers: payload });
      if (!mountedRef.current) return;
      persistGuideCompletion();
      const closing: ChatLine = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getGuideClosingText(nextAnswers),
      };
      setLines((prev) => [...prev, closing]);
      setPhase('chat');
    } catch (err) {
      if (!mountedRef.current) return;
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setError(ONBOARDING_USER_REJECTED_MSG);
      } else {
        setError(ONBOARDING_SERVER_FAIL_MSG);
      }
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }, []);

  const handleOnboardingReply = (text: string) => {
    clearOnboardingAssistantTimer();

    const step = GUIDE_STEPS[onboardingStep];
    const key = step.key;
    const nextAnswers: GuideAnswers = { ...guideAnswers, [key]: text };
    setGuideAnswers(nextAnswers);

    const userLine: ChatLine = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    setLines((prev) => [...prev, userLine]);

    const isLast = onboardingStep >= GUIDE_STEPS.length - 1;

    if (isLast) {
      setSending(true);
      void completeLastOnboardingStep(nextAnswers);
      return;
    }

    setSending(true);

    onboardingAssistantTimerRef.current = setTimeout(() => {
      onboardingAssistantTimerRef.current = null;
      if (!mountedRef.current) return;

      setSending(false);

      const nextIndex = onboardingStep + 1;
      const followUp: ChatLine = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getQuestionMessage(nextIndex),
      };
      setLines((prev) => [...prev, followUp]);
      setOnboardingStep(nextIndex);
    }, SIMULATED_ONBOARDING_ASSISTANT_DELAY_MS);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setError(null);

    if (phase === 'onboarding') {
      handleOnboardingReply(text);
      return;
    }

    const userLine: ChatLine = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    setLines((prev) => [...prev, userLine]);
    setSending(true);

    const requestStartedAt = performance.now();

    try {
      const reply = await sendChatMessage({ content: text });
      const elapsed = performance.now() - requestStartedAt;
      const remaining = Math.max(0, MIN_CHAT_ASSISTANT_DISPLAY_MS - elapsed);
      if (remaining > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, remaining);
        });
      }
      if (!mountedRef.current) return;
      setLines((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: reply.role,
          content: reply.content,
        },
      ]);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(formatApiError(err));
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const subtitle =
    phase === 'loading'
      ? 'Carregando o histórico…'
      : phase === 'onboarding'
        ? 'Primeiros passos — vamos nos conhecer melhor.'
        : 'O que você gostaria de fazer?';

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 pb-28 pt-4 md:pb-8">
      <h1 className="text-2xl font-bold text-gray-900">Assistente Flyer</h1>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

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
            <p className="mt-2 text-sm text-gray-500">Carregando histórico...</p>
          </div>
        )}
        {!loadingHistory && lines.length === 0 && phase === 'chat' && (
          <p className="text-sm text-gray-500">
            Escreva uma mensagem pra começar. Ex.: &quot;Sugere shows de jazz perto de
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
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-400" />{' '}
            Pensando...
          </p>
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex gap-2">
        <input
          type="text"
          className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
          placeholder={
            phase === 'onboarding' ? 'Responda ao guia…' : 'Digite sua mensagem…'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          disabled={sending}
          aria-label="Sua mensagem para o assistente"
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
