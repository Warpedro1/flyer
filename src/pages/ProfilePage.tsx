import { CreditCard, LogOut, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { TrophyIcon } from '../components/ui/TrophyIcon.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { type ProfileStatus, getProfileStatus, getUserTrophies } from '../services/flyerApi.ts';
import type { TrophyRead } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trophies, setTrophies] = useState<TrophyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<ProfileStatus | null>(null);

  // CPF e celular da própria conta, já mascarados pelo backend.
  useEffect(() => {
    let cancelled = false;
    getProfileStatus()
      .then((s) => {
        if (!cancelled) setIdentity(s);
      })
      .catch(() => {
        if (!cancelled) setIdentity(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    'Usuário';

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

        {identity?.complete && (
          <dl className="mt-4 grid w-full max-w-md grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <dt className="text-xs text-gray-500">CPF</dt>
              <dd className="font-mono text-sm text-gray-900">{identity.cpf_masked}</dd>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <dt className="text-xs text-gray-500">Celular</dt>
              <dd className="font-mono text-sm text-gray-900">{identity.phone_masked ?? 'Não informado'}</dd>
            </div>
          </dl>
        )}

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/plans')}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 font-semibold text-gray-800 shadow-sm transition hover:border-red-200 hover:bg-red-50"
          >
            <CreditCard className="h-5 w-5 text-red-600" />
            Gerenciar assinatura
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

        {/* A introdução do 1.º login, de novo e sem gravar nada (Warpedro1/flyer#23). */}
        <button
          type="button"
          onClick={() => navigate('/', { state: { replayIntro: true } })}
          className="mt-3 text-sm font-semibold text-red-600 hover:underline"
        >
          Ver introdução de novo
        </button>

        {/* No desktop o Sair está na barra lateral; no telemóvel ela não existe. */}
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 font-semibold text-gray-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 md:hidden"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
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
            Você ainda não tem troféus. Faça check-in nos eventos para colecionar.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {trophies.map((t) => {
            const content = (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-white">
                  <TrophyIcon iconUrl={t.icon_url} name={t.name} />
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">{t.name}</p>
                {t.acquired_at && (
                  <p className="text-xs text-gray-400">
                    {new Date(t.acquired_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </>
            );
            const card =
              'flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm';
            // O troféu leva ao evento ou lugar de onde veio (Warpedro1/flyer-back#40).
            return t.event_id ? (
              <Link
                key={t.id}
                to={`/events/${t.event_id}`}
                aria-label={`Ver o evento de ${t.name}`}
                className={`${card} transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600`}
              >
                {content}
              </Link>
            ) : (
              <div key={t.id} className={card}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
