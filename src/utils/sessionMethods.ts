/**
 * Métodos de login da sessão (`amr` do access token do Supabase): `password`, `oauth`,
 * `otp`, `recovery`… Só lê o token: quem decide é o backend, que o valida.
 */
export function sessionMethods(accessToken: string | undefined | null): string[] {
  if (!accessToken) return [];
  const part = accessToken.split('.')[1];
  if (!part) return [];
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { amr?: unknown };
    if (!Array.isArray(payload.amr)) return [];
    return payload.amr
      .map((entry: unknown) =>
        entry && typeof entry === 'object' && 'method' in entry ? String((entry as { method: unknown }).method) : '',
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Uma sessão aberta com senha tem de confirmar o código enviado por e-mail. */
export function sessionNeedsEmailCode(accessToken: string | undefined | null): boolean {
  return sessionMethods(accessToken).includes('password');
}

/** A sessão veio do link de recuperação de senha. */
export function isRecoverySession(accessToken: string | undefined | null): boolean {
  return sessionMethods(accessToken).includes('recovery');
}
