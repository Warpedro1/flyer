/** `detail` do backend quando a sessão com senha ainda não pôs o código do e-mail. */
export const EMAIL_CODE_REQUIRED = 'email_code_required';
export const EMAIL_CODE_PATH = '/login/code';
/** `detail` do backend quando a conta ainda não tem CPF e celular. */
export const PROFILE_INCOMPLETE = 'profile_incomplete';
export const COMPLETE_PROFILE_PATH = '/complete-profile';

const TARGETS: Record<string, string> = {
  [EMAIL_CODE_REQUIRED]: EMAIL_CODE_PATH,
  [PROFILE_INCOMPLETE]: COMPLETE_PROFILE_PATH,
};

/**
 * Se o backend recusou por falta do código do e-mail ou do CPF/celular, vai para o ecrã
 * que resolve isso. Devolve se era um desses casos. Nunca termina a sessão.
 */
export function redirectIfEmailCodeRequired(
  error: unknown,
  currentPath: string,
  go: (path: string) => void,
): boolean {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } } | null)?.response;
  const detail = response?.data?.detail;
  if (response?.status !== 403 || typeof detail !== 'string' || !(detail in TARGETS)) return false;
  const target = TARGETS[detail];
  if (currentPath !== target) go(target);
  return true;
}
