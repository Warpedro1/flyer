import { SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BackButton } from '../navigation/BackButton.tsx';

export interface NotFoundContentProps {
  title?: string;
  message?: string;
}

/** O conteúdo do 404 (#33): numa rota que não existe, ou quando a API diz 404. */
export function NotFoundContent({
  title = 'Não encontramos esta página',
  message = 'O endereço pode estar errado, ou o que você procura não existe mais.',
}: NotFoundContentProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <SearchX className="h-6 w-6 text-red-600" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          to="/"
          className="w-full rounded-2xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700"
        >
          Ir para o início
        </Link>
        <BackButton className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600" />
      </div>
    </div>
  );
}
