import { useState } from 'react';

import { WingHeartLogo } from '../layout/WingHeartLogo.tsx';

interface TrophyIconProps {
  /** URL assinado do ícone escolhido pelo criador; null = ícone do Flyer. */
  iconUrl: string | null;
  name: string;
  className?: string;
}

/** Ícone de um troféu, com o do Flyer quando não há imagem ou ela não carrega. */
export function TrophyIcon({ iconUrl, name, className = 'h-12 w-12' }: TrophyIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!iconUrl || failedUrl === iconUrl) {
    return <WingHeartLogo className={`${className} p-1 text-red-600`} />;
  }
  return (
    <img
      src={iconUrl}
      alt={name}
      className={`${className} rounded-2xl object-contain`}
      onError={() => setFailedUrl(iconUrl)}
    />
  );
}
