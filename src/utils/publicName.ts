import type { ProfileBrief } from '../types/index.ts';

type PublicIdentity = Pick<ProfileBrief, 'username' | 'nickname'>;

/**
 * Como uma pessoa aparece para as outras (Warpedro1/flyer-back#32): "vulgo (@usuário)",
 * só "@usuário", ou o texto padrão. Nunca o nome, que é privado (decisão 2026-11-01).
 */
export function publicName(profile: PublicIdentity | null | undefined, fallback = 'Participante'): string {
  const username = profile?.username;
  const nickname = profile?.nickname;
  if (username && nickname) return `${nickname} (@${username})`;
  if (username) return `@${username}`;
  return nickname || fallback;
}

/** Até duas letras para o avatar sem foto: das palavras do vulgo ou das partes do @usuário. */
export function initialsOf(label: string): string {
  const words = label
    .replace(/^@/, '')
    .split(/[\s._]+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w));
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? Array.from(words[0]).slice(0, 2) : [Array.from(words[0])[0], Array.from(words[1])[0]];
  return letters.join('').toUpperCase();
}
