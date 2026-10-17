import { AlertTriangle } from 'lucide-react';

export interface ErrorScreenProps {
  /** Referência que a pessoa nos pode dizer; liga ao registo em `app_errors`. */
  reference: string | null;
  onRetry: () => void;
}

/** "Algo deu errado": nunca uma tela em branco (#33). */
export function ErrorScreen({ reference, onRetry }: ErrorScreenProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Algo deu errado</h1>
        <p className="mt-2 text-sm text-gray-600">
          Esta página encontrou um erro. Tente de novo; se continuar, informe a referência abaixo.
        </p>
        {reference && <p className="mt-3 font-mono text-xs text-gray-400">{`ref ${reference}`}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-2xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Tentar de novo
          </button>
          {/* Um link normal: recarrega a app inteira, mesmo que o router esteja num estado estragado. */}
          <a href="/" className="py-2 text-sm font-medium text-gray-500 hover:text-red-600">
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
