import type { GuideAnswers } from './chatGuide.ts';

/**
 * As respostas do onboarding enquanto não é concluído (#26): uma falha ao terminar,
 * ou recarregar a página, não obriga a responder tudo outra vez. Ficam só nesta aba
 * (`sessionStorage`) e saem quando o onboarding termina.
 */
const PREFIX = 'flyer.onboardingAnswers.';

export function saveOnboardingDraft(userId: string, answers: GuideAnswers): void {
  try {
    sessionStorage.setItem(PREFIX + userId, JSON.stringify(answers));
  } catch {
    // Sem armazenamento: as respostas vivem só no ecrã.
  }
}

export function readOnboardingDraft(userId: string): GuideAnswers {
  try {
    const raw = sessionStorage.getItem(PREFIX + userId);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out as GuideAnswers;
  } catch {
    return {};
  }
}

export function clearOnboardingDraft(userId: string): void {
  try {
    sessionStorage.removeItem(PREFIX + userId);
  } catch {
    // Nada a limpar.
  }
}
