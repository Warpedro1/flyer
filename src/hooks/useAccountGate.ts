import { useEffect, useState } from 'react';

import { getEmailCodeStatus, getProfileStatus } from '../services/flyerApi.ts';
import { sessionNeedsEmailCode } from '../utils/sessionMethods.ts';

export type AccountGate = 'checking' | 'ok' | 'needs_code' | 'needs_signup_code' | 'needs_profile';

/** O que a introdução do 1.º login precisa saber (Warpedro1/flyer#23). */
export interface IntroState {
  seen: boolean;
  onboarded: boolean;
}

export interface AccountGateState {
  gate: AccountGate;
  /** null até a conta ser conferida, ou com um backend que ainda não diz isto. */
  intro: IntroState | null;
}

/**
 * O que falta à conta antes de mostrar a app (decisões 2026-10-12), por esta ordem:
 * 1. o código enviado por e-mail, numa sessão aberta com senha;
 * 2. o código do cadastro, posto no navegador que o fez (decisões 2026-10-14);
 * 3. o CPF (contas Google no 1.º acesso; o celular é opcional, Warpedro1/flyer-back#29).
 * Quem impõe as regras é o backend (403); isto só evita mostrar a app antes do tempo.
 */
export function useAccountGate(accessToken: string | undefined, userId: string | undefined): AccountGateState {
  const needsCode = sessionNeedsEmailCode(accessToken);
  const [gate, setGate] = useState<AccountGate>(userId ? 'checking' : 'ok');
  const [intro, setIntro] = useState<IntroState | null>(null);

  useEffect(() => {
    if (!userId) {
      setGate('ok');
      return;
    }
    let cancelled = false;
    setGate('checking');
    (async () => {
      if (needsCode) {
        const code = await getEmailCodeStatus();
        if (code.required && !code.verified) return 'needs_code' as const;
      }
      const profile = await getProfileStatus();
      // O status já diz se a introdução foi vista: o tour não custa um pedido a mais.
      if (!cancelled && typeof profile.intro_seen === 'boolean') {
        setIntro({ seen: profile.intro_seen, onboarded: profile.onboarded === true });
      }
      if (profile.pending) return 'needs_signup_code' as const;
      return profile.complete ? ('ok' as const) : ('needs_profile' as const);
    })()
      .then((next) => {
        if (!cancelled) setGate(next);
      })
      .catch(() => {
        // Sem resposta, a app abre; o backend continua a recusar o que faltar.
        if (!cancelled) setGate('ok');
      });
    return () => {
      cancelled = true;
    };
    // O token renova-se de hora a hora; a sessão e a conta são as mesmas.
  }, [needsCode, userId]);

  return { gate, intro };
}
