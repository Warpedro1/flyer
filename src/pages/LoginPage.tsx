import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import {
  AuthMessage,
  AuthShell,
  authInput,
  authLabel,
  authLink,
  authPrimaryButton,
} from '../components/auth/AuthShell.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { signInWithPassword } from '../services/authApi.ts';
import { sessionNeedsEmailCode } from '../utils/sessionMethods.ts';
import { readSignupTicket } from '../utils/signupTicket.ts';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, session, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

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

  if (user && !busy) {
    // Com senha, o login só termina com o código enviado por e-mail.
    return <Navigate to={sessionNeedsEmailCode(session?.access_token) ? '/login/code' : '/'} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setBusy(true);
    const result = await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (result.ok) {
      void navigate('/login/code', { replace: true });
      return;
    }
    setError(result.message);
    setUnconfirmed(result.code === 'email_not_confirmed');
  };

  // Cadastro sem o código posto: só o separador que o fez o pode concluir (2026-10-14).
  const hasSignupTicket = unconfirmed && readSignupTicket() !== null;

  return (
    <AuthShell title="Entrar no Flyer" subtitle="Descobre eventos e lugares e faz check-in.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {unconfirmed && (
          <Link
            to={hasSignupTicket ? '/signup/code' : '/signup'}
            className="block w-full rounded-xl border border-red-200 py-2.5 text-center text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            {hasSignupTicket ? 'Pôr o código do cadastro' : 'Fazer o cadastro outra vez'}
          </Link>
        )}
        <div>
          <label htmlFor="email" className={authLabel}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className={authInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className={authInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-right text-sm">
            <Link to="/forgot-password" className={authLink}>
              Esqueci a senha
            </Link>
          </div>
        </div>
        <button type="submit" disabled={busy} className={authPrimaryButton}>
          {busy ? 'A entrar…' : 'Entrar'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        ou
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 py-3.5 font-semibold text-gray-800 transition hover:bg-gray-50"
      >
        <GoogleIcon />
        Continuar com Google
      </button>

      <p className="mt-6 text-center text-sm text-gray-600">
        Ainda não tens conta?{' '}
        <Link to="/signup" className={authLink}>
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
