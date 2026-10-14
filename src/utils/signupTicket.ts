/**
 * O bilhete que liga o código do cadastro ao navegador que o fez (decisões 2026-10-14).
 *
 * Fica em `localStorage`: vale em qualquer separador ou janela deste navegador, mesmo
 * depois de o fechar, mas não noutro aparelho ou navegador (nem nas mãos de quem
 * recebeu o e-mail por engano). Passadas 24 h deixa de contar: um cadastro novo
 * substitui a conta pendente.
 */
export interface SignupTicket {
  ticket: string;
  email: string;
}

const KEY = 'flyer.signupTicket';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredTicket extends SignupTicket {
  savedAt: number;
}

function isStoredTicket(value: unknown): value is StoredTicket {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<StoredTicket>;
  return typeof v.ticket === 'string' && typeof v.email === 'string' && typeof v.savedAt === 'number';
}

export function saveSignupTicket(value: SignupTicket): void {
  try {
    const stored: StoredTicket = { ticket: value.ticket, email: value.email, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Sem armazenamento (modo privado bloqueado): o ecrã do código explica o que fazer.
  }
}

export function clearSignupTicket(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nada a limpar.
  }
}

export function readSignupTicket(): SignupTicket | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredTicket(parsed)) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearSignupTicket();
      return null;
    }
    return { ticket: parsed.ticket, email: parsed.email };
  } catch {
    return null;
  }
}
