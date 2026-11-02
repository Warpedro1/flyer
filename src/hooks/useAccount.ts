import { useOutletContext } from 'react-router-dom';

/** A identidade pública da própria pessoa, para o menu (Warpedro1/flyer-back#32). */
export interface AccountSummary {
  username: string | null;
  avatarUrl: string | null;
}

/** O que o `AppLayout` passa às páginas pelo `<Outlet>`. */
export interface AccountContext {
  account: AccountSummary | null;
  /** Confere de novo a conta (depois de trocar a foto, o @usuário ou completar o CPF). */
  refreshAccount: () => void;
}

const OUTSIDE_LAYOUT: AccountContext = { account: null, refreshAccount: () => undefined };

/** A conta conferida pelo layout; fora dele (testes, telas soltas), nada a atualizar. */
export function useAccount(): AccountContext {
  return useOutletContext<AccountContext | undefined>() ?? OUTSIDE_LAYOUT;
}
