import { type ReactNode, useId } from 'react';

/** Um cartão de "Meus dados", com o título que dá nome à região (leitores de tela). */
export function DataSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 id={id} className="text-base font-bold text-gray-900">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export const dataInput =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-50 disabled:text-gray-500';
export const dataPrimaryButton =
  'rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50';
export const dataSecondaryButton =
  'rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50';

/**
 * O resultado de salvar: erro ou "Salvo.". A região fica sempre na tela, mesmo vazia,
 * para o leitor de tela anunciar o que aparece nela.
 */
export function SaveMessage({ error, saved }: { error: string | null; saved: boolean }) {
  return (
    <div aria-live="polite" className="text-sm">
      {error ? (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      ) : (
        saved && <p className="mt-2 text-green-700">Salvo.</p>
      )}
    </div>
  );
}
