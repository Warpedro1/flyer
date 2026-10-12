import type { AuthError } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase.ts';

/** Resultado de uma ação de conta, com a mensagem já em português. */
export type AuthResult = { ok: true } | { ok: false; code: string; message: string };

const MESSAGES: Record<string, string> = {
  // Igual para e-mail inexistente e senha errada: não se revela quem tem conta.
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirma o teu e-mail: abre o link que te enviámos.',
  weak_password: 'Esta senha é fraca ou já apareceu numa fuga de dados. Escolhe outra.',
  same_password: 'A senha nova tem de ser diferente da anterior.',
  over_email_send_rate_limit: 'Muitos pedidos seguidos. Espera um minuto e tenta outra vez.',
  over_request_rate_limit: 'Muitos pedidos seguidos. Espera um minuto e tenta outra vez.',
  email_address_invalid: 'Este e-mail não é válido.',
  signup_disabled: 'O cadastro com e-mail está desligado de momento.',
};

function fail(error: AuthError): AuthResult {
  const code = error.code ?? (error.status === 429 ? 'over_request_rate_limit' : 'unknown');
  return { ok: false, code, message: MESSAGES[code] ?? 'Não foi possível concluir. Tenta outra vez.' };
}

const origin = () => window.location.origin;

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? fail(error) : { ok: true };
}

export async function resendConfirmation(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origin()}/` },
  });
  return error ? fail(error) : { ok: true };
}

/** Envia o link para criar uma senha nova (abre em /reset-password). */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin()}/reset-password`,
  });
  return error ? fail(error) : { ok: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password });
  return error ? fail(error) : { ok: true };
}
