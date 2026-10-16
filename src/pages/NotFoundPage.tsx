import { NotFoundContent } from '../components/errors/NotFound.tsx';

/** Rota que não existe (#33): diz o que aconteceu em vez de levar ao início em silêncio. */
export default function NotFoundPage() {
  return (
    <div className="flex h-screen items-center justify-center overflow-y-auto bg-gray-50 p-6">
      <NotFoundContent />
    </div>
  );
}
