import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface BackButtonProps {
  className?: string;
}

/**
 * "Voltar" por extenso. Aberto por um link direto não há ecrã anterior na app
 * (`navigate(-1)` sairia do site ou não faria nada), por isso leva ao início.
 */
export function BackButton({ className }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-gray-800 shadow-md backdrop-blur transition hover:text-red-600'
      }
    >
      <ArrowLeft className="h-5 w-5" />
      Voltar
    </button>
  );
}
