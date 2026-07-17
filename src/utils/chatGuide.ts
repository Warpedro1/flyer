/** Onboarding do chat: perguntas padronizadas antes de chamar a API de IA (pt-BR). */

export const CHAT_GUIDE_STORAGE_DONE = 'flyer_chat_guide_done';

export type GuideAnswerKey =
  | 'free_time'
  | 'ideal_weekend'
  | 'hobby_to_start'
  | 'favorite_media'
  | 'one_food_forever'
  | 'sleep_preference';

export type GuideAnswers = Partial<Record<GuideAnswerKey, string>>;

/**
 * Primeiro nome a partir dos metadados do usuário (ex.: Google: `given_name`, `full_name`).
 */
export function getFirstNameFromUserMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const asTrimmedString = (v: unknown): string =>
    typeof v === 'string' ? v.trim() : '';

  const given = asTrimmedString(metadata?.given_name);
  if (given) return given;

  const full = asTrimmedString(metadata?.full_name) || asTrimmedString(metadata?.name);
  if (!full) return null;

  const first = full.split(/\s+/)[0]?.trim();
  return first || null;
}

/** Primeira mensagem do guia: só o contexto, sem pergunta. */
export function getGuideIntroMessage(firstName: string | null | undefined): string {
  const name = firstName?.trim();
  if (name) {
    return `Olá, ${name}! Pra começar, queria saber um pouco mais sobre você.`;
  }
  return 'Olá! Pra começar, queria saber um pouco mais sobre você.';
}

export const GUIDE_STEPS: readonly { key: GuideAnswerKey; prompt: string }[] = [
  {
    key: 'free_time',
    prompt: 'O que você mais gosta de fazer no seu tempo livre?',
  },
  {
    key: 'ideal_weekend',
    prompt: 'Como você imagina que seria o fim de semana ideal?',
  },
  {
    key: 'hobby_to_start',
    prompt: 'Se você tivesse que fazer uma atividade nova, o que seria?',
  },
  {
    key: 'favorite_media',
    prompt:
      'Se você estivesse indo para uma ilha deserta e só pudesse levar um livro, um filme e uma música, quais seriam?',
  },
  {
    key: 'one_food_forever',
    prompt: 'Se só pudesse comer uma comida pelo resto da vida, qual seria?',
  },
  {
    key: 'sleep_preference',
    prompt: 'Você prefere acordar cedo ou dormir até tarde?',
  },
] as const;

const STEP_LABELS: Record<GuideAnswerKey, string> = {
  free_time: 'Tempo livre',
  ideal_weekend: 'Fim de semana ideal',
  hobby_to_start: 'Hobby que gostaria de começar',
  favorite_media: 'Filme, livro ou música',
  one_food_forever: 'Comida para o resto da vida',
  sleep_preference: 'Rotina de sono',
};

/** Texto da pergunta no índice dado (cada uma vira uma mensagem separada na UI). */
export function getQuestionMessage(stepIndex: number): string {
  return GUIDE_STEPS[stepIndex].prompt;
}

/**
 * Texto único com introdução + 1ª pergunta (legado).
 * Preferível: `getGuideIntroMessage` e `getQuestionMessage(0)` em mensagens separadas na UI.
 */
export function getGuideOpeningText(firstName?: string | null): string {
  return `${getGuideIntroMessage(firstName)}\n\n${getQuestionMessage(0)}`;
}

/** @deprecated Use `getQuestionMessage(stepIndex)`. */
export function getGuideFollowUpText(stepIndex: number): string {
  return getQuestionMessage(stepIndex);
}

export function buildPreferencesSummary(answers: GuideAnswers): string {
  const lines: string[] = [];
  for (const { key } of GUIDE_STEPS) {
    const v = answers[key]?.trim();
    if (v) lines.push(`- ${STEP_LABELS[key]}: ${v}`);
  }
  return lines.join('\n');
}

export function getGuideClosingText(answers: GuideAnswers): string {
  const summary = buildPreferencesSummary(answers);
  return (
    'Obrigado! Fiz um resumo do que entendi:\n\n' +
    summary +
    '\n\nDaqui pra frente, o assistente Flyer (IA) pode usar esse contexto nas respostas. ' +
    'Se quiser mudar alguma coisa, é só falar.\n\n' +
    'Quando quiser, manda sua primeira pergunta ou pedido sobre eventos.'
  );
}

export function persistGuideCompletion(): void {
  try {
    sessionStorage.setItem(CHAT_GUIDE_STORAGE_DONE, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

export function isGuideMarkedDoneInStorage(): boolean {
  try {
    return sessionStorage.getItem(CHAT_GUIDE_STORAGE_DONE) === '1';
  } catch {
    return false;
  }
}

/** Payload for `POST /chat/complete-onboarding` (all keys required). */
export function guideAnswersToCompletePayload(answers: GuideAnswers): Record<GuideAnswerKey, string> {
  const out = {} as Record<GuideAnswerKey, string>;
  for (const { key } of GUIDE_STEPS) {
    const v = answers[key]?.trim();
    if (!v) {
      throw new Error(`Missing onboarding answer for step ${key}`);
    }
    out[key] = v;
  }
  return out;
}
