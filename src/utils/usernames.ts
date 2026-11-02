import type { UsernameAvailability } from '../types/index.ts';

/** A mesma regra do backend (`core/usernames.py`, Warpedro1/flyer-back#32), dita por extenso. */
export const USERNAME_RULE =
  'Use de 3 a 20 letras minúsculas sem acento, números (até 7 no total), ponto ou _, com pelo menos uma letra e sem ponto no começo, no fim ou repetido.';

/** Como o backend guarda o que se digita: sem espaços, sem o @ do começo, em minúsculas. */
export function normalizeUsername(value: string): string {
  return value.replace(/\s+/g, '').replace(/^@+/, '').toLowerCase();
}

/**
 * Um @usuário a partir do nome, como o banco faz (`generate_username`): sem acentos nem
 * números, as palavras ligadas por ponto, até 15 caracteres. Só uma sugestão: a
 * disponibilidade vem do backend.
 */
export function usernameFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 15)
    .replace(/\.+$/, '');
}

const REFUSALS: Record<NonNullable<UsernameAvailability['reason']>, string> = {
  invalid: USERNAME_RULE,
  reserved: 'Este @usuário é reservado. Escolha outro.',
  taken: 'Este @usuário já está em uso.',
};

/** Por que um @usuário não pode ser usado (null quando pode, ou sem resposta da conferência). */
export function usernameRefusal(check: UsernameAvailability | null): string | null {
  if (!check || check.available) return null;
  return check.reason ? REFUSALS[check.reason] : REFUSALS.taken;
}
