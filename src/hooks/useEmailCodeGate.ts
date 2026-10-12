import { useEffect, useState } from 'react';

import { getEmailCodeStatus } from '../services/flyerApi.ts';
import { sessionNeedsEmailCode } from '../utils/sessionMethods.ts';

export type EmailCodeGate = 'checking' | 'ok' | 'needs_code';

/**
 * Uma sessão aberta com senha só entra na app depois do código enviado por e-mail.
 * Quem impõe a regra é o backend (403 `email_code_required`); isto só evita mostrar a
 * app a quem ainda não pôs o código. Sessões Google nem perguntam.
 */
export function useEmailCodeGate(accessToken: string | undefined): EmailCodeGate {
  const needs = sessionNeedsEmailCode(accessToken);
  const [gate, setGate] = useState<EmailCodeGate>(needs ? 'checking' : 'ok');

  useEffect(() => {
    if (!needs) {
      setGate('ok');
      return;
    }
    let cancelled = false;
    setGate('checking');
    getEmailCodeStatus()
      .then((s) => {
        if (!cancelled) setGate(s.required && !s.verified ? 'needs_code' : 'ok');
      })
      .catch(() => {
        // Sem resposta, a app abre; o backend continua a recusar sem o código.
        if (!cancelled) setGate('ok');
      });
    return () => {
      cancelled = true;
    };
    // O token renova-se de hora a hora; a sessão (e o código) é a mesma.
  }, [needs]);

  return gate;
}
