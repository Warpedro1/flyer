import { useEffect, useState } from 'react';

import { getEmailCodeStatus, getProfileStatus } from '../services/flyerApi.ts';
import { sessionNeedsEmailCode } from '../utils/sessionMethods.ts';

export type AccountGate = 'checking' | 'ok' | 'needs_code' | 'needs_profile';

/**
 * O que falta à conta antes de mostrar a app (decisões 2026-10-12), por esta ordem:
 * 1. o código enviado por e-mail, numa sessão aberta com senha;
 * 2. o CPF e o celular (contas Google no 1.º acesso).
 * Quem impõe as regras é o backend (403); isto só evita mostrar a app antes do tempo.
 */
export function useAccountGate(accessToken: string | undefined, userId: string | undefined): AccountGate {
  const needsCode = sessionNeedsEmailCode(accessToken);
  const [gate, setGate] = useState<AccountGate>(userId ? 'checking' : 'ok');

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

  return gate;
}
