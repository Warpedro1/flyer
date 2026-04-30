import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listPlans } from '../services/flyerApi.ts';
import type { PlanRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

function formatPlanPrice(price: string | null, interval: string | null): string {
  if (price === null) return 'Grátis';
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  const suffix = interval ? `/${interval}` : '';
  return `${formatted} €${suffix}`;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listPlans();
        if (!cancelled) setPlans(data);
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-4 md:pb-8">
      <div className="mx-auto max-w-6xl px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-red-600"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Planos Flyer</h1>
          <p className="mt-2 text-gray-500">
            Escolhe o plano ideal para ti e desbloqueia funcionalidades premium.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <p className="text-center text-gray-500">Nenhum plano disponível de momento.</p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, idx) => {
            const isFree = plan.price === null;
            const variant =
              idx === 0 ? 'light' : idx === 1 ? 'highlight' : 'dark';

            const cardClass =
              variant === 'light'
                ? 'border border-gray-200 bg-white'
                : variant === 'highlight'
                  ? 'border-2 border-red-600 bg-white shadow-xl shadow-red-100 ring-2 ring-red-100'
                  : 'border border-gray-700 bg-gray-900 text-white';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col overflow-hidden rounded-3xl ${cardClass}`}
              >
                {variant === 'highlight' && (
                  <div className="bg-red-600 py-2 text-center text-sm font-bold text-white">
                    Mais popular
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6 text-center">
                  <h2 className={`text-xl font-bold ${variant === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h2>
                  <p
                    className={`mt-4 text-4xl font-bold ${
                      variant === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    {formatPlanPrice(plan.price, plan.interval)}
                  </p>
                  <ul className="mt-6 flex flex-1 flex-col gap-3 text-left">
                    {plan.features.map((feat, fi) => (
                      <li key={fi} className="flex gap-2 text-sm">
                        <Check
                          className={`h-5 w-5 shrink-0 ${
                            variant === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`}
                        />
                        <span className={variant === 'dark' ? 'text-gray-200' : 'text-gray-600'}>
                          {feat}
                        </span>
                      </li>
                    ))}
                    {plan.features.length === 0 && (
                      <li className={`text-sm ${variant === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Sem detalhes adicionais.
                      </li>
                    )}
                  </ul>
                  <button
                    type="button"
                    disabled
                    className={`mt-8 w-full rounded-2xl py-3 font-semibold ${
                      isFree
                        ? variant === 'dark'
                          ? 'border border-gray-600 text-gray-300'
                          : 'border border-gray-300 text-gray-700'
                        : variant === 'dark'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-600 text-white'
                    } opacity-80`}
                  >
                    {isFree ? 'Plano actual' : 'Subscrever'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
