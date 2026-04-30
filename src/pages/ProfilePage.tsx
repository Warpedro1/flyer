import { CreditCard, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { WingHeartLogo } from '../components/layout/WingHeartLogo.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { getUserTrophies } from '../services/flyerApi.ts';
import type { TrophyRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trophies, setTrophies] = useState<TrophyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getUserTrophies();
        if (!cancelled) setTrophies(data);
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

  const avatarUrl =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? DEFAULT_AVATAR;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    'Utilizador';

  return (
    <div className="mx-auto max-w-3xl p-4 pb-28 sm:p-8 md:pb-8">
      <div className="flex flex-col items-center text-center">
        <img
          src={avatarUrl}
          alt=""
          className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-xl ring-4 ring-red-100"
        />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{displayName}</h1>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <span className="mt-3 inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
          Plano Flyer
        </span>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/plans')}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 font-semibold text-gray-800 shadow-sm transition hover:border-red-200 hover:bg-red-50"
          >
            <CreditCard className="h-5 w-5 text-red-600" />
            Gerir assinatura
          </button>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 font-semibold text-gray-800 shadow-sm transition hover:border-red-200 hover:bg-red-50"
          >
            <Users className="h-5 w-5 text-red-600" />
            Amigos
          </button>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Estante de troféus</h2>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          </div>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>
        )}

        {!loading && !error && trophies.length === 0 && (
          <p className="text-center text-gray-500">
            Ainda não tens troféus. Faz check-in nos eventos para coleccionar.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {trophies.map((t) => (
            <div
              key={t.id}
              className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-white">
                {t.icon_url ? (
                  <img src={t.icon_url} alt="" className="h-12 w-12 object-contain" />
                ) : (
                  <WingHeartLogo className="h-10 w-10 text-red-600" />
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">{t.name}</p>
              {t.acquired_at && (
                <p className="text-xs text-gray-400">
                  {new Date(t.acquired_at).toLocaleDateString('pt-PT')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
