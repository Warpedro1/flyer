import { useEffect, useRef, useState } from 'react';

import { checkUsername } from '../services/flyerApi.ts';
import type { UsernameAvailability } from '../types/index.ts';

/**
 * Confere se um @usuário está livre enquanto se digita (com uma pequena espera). Uma
 * resposta atrasada de um texto antigo é ignorada; sem resposta, quem decide é o backend
 * ao salvar. `current` é o @ que a pessoa já tem (não precisa de conferência).
 */
export function useUsernameCheck(draft: string, current: string | null = null): UsernameAvailability | null {
  const [result, setResult] = useState<UsernameAvailability | null>(null);
  const latest = useRef('');

  useEffect(() => {
    latest.current = draft;
    setResult(null);
    if (!draft || draft === current) return undefined;
    const timer = setTimeout(() => {
      checkUsername(draft)
        .then((answer) => {
          if (latest.current === draft) setResult(answer);
        })
        .catch(() => undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, current]);

  return result;
}
