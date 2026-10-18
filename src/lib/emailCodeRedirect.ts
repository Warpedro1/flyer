/** `detail` do backend quando a sessão com senha ainda não pôs o código do e-mail. */
export const EMAIL_CODE_REQUIRED = 'email_code_required';
export const EMAIL_CODE_PATH = '/login/code';
/** `detail` do backend quando a conta ainda não tem CPF e celular. */
export const PROFILE_INCOMPLETE = 'profile_incomplete';
export const COMPLETE_PROFILE_PATH = '/complete-profile';
/** `detail` do backend quando o código do cadastro ainda não foi posto no seu navegador. */
export const SIGNUP_PENDING = 'signup_pending';
export const SIGNUP_CODE_PATH = '/signup/code';

const TARGETS: Record<string, string> = {
  [EMAIL_CODE_REQUIRED]: EMAIL_CODE_PATH,
  [PROFILE_INCOMPLETE]: COMPLETE_PROFILE_PATH,
  [SIGNUP_PENDING]: SIGNUP_CODE_PATH,
};

/**
 * Se o backend recusou por falta do código do e-mail, do código do cadastro ou do
 * CPF/celular, vai para o ecrã
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

/** `code` do backend quando o pedido chegou sem token (Warpedro1/flyer-back#42). */
export const NOT_AUTHENTICATED = 'not_authenticated';
export const LOGIN_PATH = '/login';
const ENTRY_PATHS = new Set([
  LOGIN_PATH,
  EMAIL_CODE_PATH,
  '/signup',
  SIGNUP_CODE_PATH,
  '/forgot-password',
  '/reset-password',
]);

/**
 * Um pedido feito sem sessão (ela acabou entre dois pedidos) vai para o login. Só o
 * 401 `not_authenticated`: um token recusado pelo backend não tira ninguém da tela.
 */
export function redirectIfNotAuthenticated(
  error: unknown,
  currentPath: string,
  go: (path: string) => void,
): boolean {
  const response = (error as { response?: { status?: number; data?: { code?: unknown } } } | null)?.response;
  if (response?.status !== 401 || response.data?.code !== NOT_AUTHENTICATED) return false;
  if (!ENTRY_PATHS.has(currentPath)) go(LOGIN_PATH);
  return true;
}
