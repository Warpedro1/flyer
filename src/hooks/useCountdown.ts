import { useEffect, useMemo, useState } from 'react';

export interface Countdown {
  /** Segundos que faltam, nunca negativo. */
  secondsLeft: number;
  /** `m:ss`, ou string vazia quando não há instante para contar. */
  label: string;
  expired: boolean;
}

function secondsUntil(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

function format(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/**
 * Conta para trás até `until`, de segundo a segundo.
 *
 * Usado no prazo que a pessoa chamada tem para aparecer. Chegar a zero não
 * significa que já é `no_show` — quem decide isso é o backend na varredura
 * seguinte; aqui só se mostra que o tempo acabou.
 */
export function useCountdown(until: string | null | undefined): Countdown {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    until ? secondsUntil(until) : 0,
  );

  useEffect(() => {
    if (!until) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(secondsUntil(until));
    const id = setInterval(() => setSecondsLeft(secondsUntil(until)), 1000);
    return () => clearInterval(id);
  }, [until]);

  return useMemo(
    () => ({
      secondsLeft,
      label: until ? format(secondsLeft) : '',
      expired: Boolean(until) && secondsLeft === 0,
    }),
    [secondsLeft, until],
  );
}
