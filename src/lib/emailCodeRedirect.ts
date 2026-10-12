/** `detail` do backend quando a sessão com senha ainda não pôs o código do e-mail. */
export const EMAIL_CODE_REQUIRED = 'email_code_required';
export const EMAIL_CODE_PATH = '/login/code';

/**
 * Se o backend recusou por falta do código enviado por e-mail, vai para o ecrã do código.
 * Devolve se redirecionou. Nunca termina a sessão.
 */
export function redirectIfEmailCodeRequired(
  error: unknown,
  currentPath: string,
  go: (path: string) => void,
): boolean {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } } | null)?.response;
  if (response?.status !== 403 || response.data?.detail !== EMAIL_CODE_REQUIRED) return false;
  if (currentPath !== EMAIL_CODE_PATH) go(EMAIL_CODE_PATH);
  return true;
}
