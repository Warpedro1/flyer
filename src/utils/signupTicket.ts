/**
 * O bilhete que liga o código do cadastro ao separador que o fez (decisão 2026-10-14).
 *
 * Fica em `sessionStorage`, que é só deste separador: o código que chega por e-mail
 * não ativa a conta noutro sítio (nem nas mãos de quem recebeu o e-mail por engano).
 */
export interface SignupTicket {
  ticket: string;
  email: string;
}

const KEY = 'flyer.signupTicket';

export function saveSignupTicket(value: SignupTicket): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Sem armazenamento (modo privado bloqueado): o ecrã do código explica o que fazer.
  }
}

export function readSignupTicket(): SignupTicket | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as SignupTicket).ticket === 'string' &&
      typeof (parsed as SignupTicket).email === 'string'
    ) {
      return { ticket: (parsed as SignupTicket).ticket, email: (parsed as SignupTicket).email };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSignupTicket(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nada a limpar.
  }
}
