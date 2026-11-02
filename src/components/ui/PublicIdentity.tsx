import type { ProfileBrief } from '../../types/index.ts';

/**
 * Uma pessoa numa lista: o vulgo numa linha e o @usuário na de baixo, cada um cortado
 * no seu espaço. Numa linha só ("vulgo (@usuário)"), um vulgo longo esconderia o @, que
 * é o que identifica a pessoa (Warpedro1/flyer-back#32). Nunca o nome.
 */
export function PublicIdentity({
  profile,
  fallback = 'Participante',
}: {
  profile: Pick<ProfileBrief, 'username' | 'nickname'>;
  fallback?: string;
}) {
  const handle = profile.username ? `@${profile.username}` : null;
  const primary = profile.nickname || handle || fallback;
  const secondary = profile.nickname && handle ? handle : null;
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{primary}</span>
      {secondary && <span className="truncate text-xs font-normal text-gray-500">{secondary}</span>}
    </span>
  );
}
