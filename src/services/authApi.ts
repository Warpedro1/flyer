import type { AuthError } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase.ts';

/** Resultado de uma ação de conta, com a mensagem já em português. */
export type AuthResult = { ok: true } | { ok: false; code: string; message: string };

const MESSAGES: Record<string, string> = {
  // Igual para e-mail inexistente e senha errada: não se revela quem tem conta.
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'O cadastro deste e-mail não foi concluído: falta o código que enviamos para você.',
  otp_expired: 'Código inválido ou expirado.',
  weak_password: 'Esta senha é fraca ou já apareceu em um vazamento de dados. Escolha outra.',
  same_password: 'A senha nova precisa ser diferente da anterior.',
  over_email_send_rate_limit: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
  email_address_invalid: 'Este e-mail não é válido.',
  signup_disabled: 'O cadastro com e-mail está desativado no momento.',
};

function fail(error: AuthError): AuthResult {
  const code = error.code ?? (error.status === 429 ? 'over_request_rate_limit' : 'unknown');
  return { ok: false, code, message: MESSAGES[code] ?? 'Não foi possível concluir. Tente de novo.' };
}

const origin = () => window.location.origin;

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? fail(error) : { ok: true };
}

/** Reenvia o código do cadastro (o e-mail não traz link: decisão 2026-10-14). */
export async function resendConfirmation(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return error ? fail(error) : { ok: true };
}

/**
 * Confere o código do cadastro e abre a sessão. Sozinho não ativa a conta: falta o
 * bilhete deste navegador (`activateSignup`), que o backend exige.
 */
export async function verifySignupCode(email: string, code: string): Promise<AuthResult> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (!error) return { ok: true };
  const result = fail(error);
  // O Supabase responde 403 a um código errado ou vencido.
  return result.ok || result.code !== 'unknown' ? result : { ...result, message: MESSAGES.otp_expired };
}

/**
 * Envia o código para criar uma senha nova (modelo "Reset Password", só `{{ .Token }}`:
 * os antivírus de e-mail abrem os links e gastariam um link de uso único, #43). O
 * `redirectTo` só serve aos links de e-mails enviados antes dessa mudança.
 */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin()}/reset-password`,
  });
  return error ? fail(error) : { ok: true };
}

/** Confere o código da troca de senha e abre uma sessão de recuperação (`amr` recovery). */
export async function verifyRecoveryCode(email: string, code: string): Promise<AuthResult> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (!error) return { ok: true };
  const result = fail(error);
  // O Supabase responde 403 a um código errado ou vencido.
  return result.ok || result.code !== 'unknown' ? result : { ...result, message: MESSAGES.otp_expired };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password });
  return error ? fail(error) : { ok: true };
}
