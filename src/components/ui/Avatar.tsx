import { useState } from 'react';

import { initialsOf } from '../../utils/publicName.ts';

interface AvatarProps {
  /** URL assinado da foto de perfil; null = iniciais. */
  url: string | null | undefined;
  /** O que identifica a pessoa (vulgo ou @usuário), para as iniciais. */
  label: string;
  className?: string;
}

/** A foto de alguém, ou as iniciais quando não há foto ou ela não carrega. Decorativa: o nome vem ao lado. */
export function Avatar({ url, label, className = 'h-10 w-10 text-sm' }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (url && failedUrl !== url) {
    return (
      <img
        src={url}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover`}
        onError={() => setFailedUrl(url)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-red-100 font-semibold text-red-700`}
    >
      {initialsOf(label)}
    </span>
  );
}
