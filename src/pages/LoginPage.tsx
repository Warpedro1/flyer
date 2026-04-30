import { Navigate } from 'react-router-dom';

import { WingHeartLogo } from '../components/layout/WingHeartLogo.tsx';
import { useAuth } from '../hooks/useAuth.ts';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-red-950">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-red-500 border-t-transparent"
          role="status"
          aria-label="A carregar"
        />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-red-950 px-4">
      <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-red-600 to-red-500 shadow-2xl shadow-red-900/50">
        <WingHeartLogo className="h-14 w-14 text-white" />
      </div>
      <h1 className="text-4xl font-bold text-white">Flyer</h1>
      <p className="mt-3 max-w-sm text-center text-gray-400">
        Inicia sessão com a tua conta Google para descobrir eventos e fazer check-in.
      </p>
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="mt-10 flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-red-600 py-4 text-lg font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuar com Google
      </button>
    </div>
  );
}
