import { useCallback, useEffect, useRef, useState } from 'react';

import { type ProfileStatus, getEmailCodeStatus, getProfileStatus } from '../services/flyerApi.ts';
import { sessionNeedsEmailCode } from '../utils/sessionMethods.ts';
import type { AccountSummary } from './useAccount.ts';

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
  /** O @usuário e a foto da própria pessoa, para o menu; null até a conta ser conferida. */
  account: AccountSummary | null;
  /**
   * Confere de novo, sem voltar à tela de espera (depois de completar o CPF ou trocar a
   * foto). Termina quando o novo estado já foi aplicado: quem navega depois disso já
   * encontra o layout certo.
   */
  recheck: () => Promise<void>;
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
  const [account, setAccount] = useState<AccountSummary | null>(null);
  // De quem é a conta já conferida: outra conta (ou a primeira vez) mostra a espera.
  const checkedUser = useRef<string | undefined>(undefined);

  /** O que o status diz da conta: o @usuário e a foto, a introdução, e o que ainda falta. */
  const applyStatus = useCallback((profile: ProfileStatus): AccountGate => {
    setAccount({ username: profile.username ?? null, avatarUrl: profile.avatar_url ?? null });
    // O status já diz se a introdução foi vista: o tour não custa um pedido a mais.
    if (typeof profile.intro_seen === 'boolean') {
      setIntro({ seen: profile.intro_seen, onboarded: profile.onboarded === true });
    }
    if (profile.pending) return 'needs_signup_code';
    return profile.complete ? 'ok' : 'needs_profile';
  }, []);

  const recheck = useCallback(async () => {
    if (!userId) return;
    try {
      const next = applyStatus(await getProfileStatus());
      // O código do e-mail, se ainda falta, continua a vir antes de tudo.
      setGate((current) => (current === 'needs_code' ? current : next));
    } catch {
      // Sem resposta, fica como está; o backend continua a recusar o que faltar.
    }
  }, [userId, applyStatus]);

  useEffect(() => {
    if (!userId) {
      setGate('ok');
      return;
    }
    let cancelled = false;
    if (checkedUser.current !== userId) setGate('checking');
    (async () => {
      if (needsCode) {
        const code = await getEmailCodeStatus();
        if (code.required && !code.verified) return 'needs_code' as const;
      }
      const profile = await getProfileStatus();
      return cancelled ? null : applyStatus(profile);
    })()
      .then((next) => {
        if (cancelled || next === null) return;
        checkedUser.current = userId;
        setGate(next);
      })
      .catch(() => {
        // Sem resposta, a app abre; o backend continua a recusar o que faltar.
        if (cancelled) return;
        checkedUser.current = userId;
        setGate('ok');
      });
    return () => {
      cancelled = true;
    };
    // O token renova-se de hora a hora; a sessão e a conta são as mesmas.
  }, [needsCode, userId, applyStatus]);

  return { gate, intro, account, recheck };
}
