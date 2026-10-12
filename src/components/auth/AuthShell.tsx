import type { ReactNode } from 'react';

import { WingHeartLogo } from '../layout/WingHeartLogo.tsx';

/** Classes partilhadas pelos campos e botões das telas de conta. */
export const authInput =
  'mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200';
export const authLabel = 'block text-sm font-medium text-gray-700';
export const authPrimaryButton =
  'flex w-full items-center justify-center rounded-2xl bg-red-600 py-3.5 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60';
export const authLink = 'font-medium text-red-600 hover:underline';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Fundo e cartão das telas de conta (login, cadastro, senha, código). */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    // O <body> não faz scroll (só o <main> da app): esta tela tem o seu próprio, senão
    // o fim do cartão ficava fora de alcance num telemóvel pequeno.
    <div
      data-testid="auth-scroll"
      className="h-[100dvh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-red-950"
    >
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-red-600 to-red-500 shadow-2xl shadow-red-900/50">
          <WingHeartLogo className="h-9 w-9 text-white" />
        </div>
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AuthMessage({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    info: 'border-gray-200 bg-gray-50 text-gray-700',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border p-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}
