import { type FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import {
  AuthMessage,
  AuthShell,
  authInput,
  authLabel,
  authLink,
  authPrimaryButton,
} from '../components/auth/AuthShell.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { useCountdown } from '../hooks/useCountdown.ts';
import { resendConfirmation, signUp } from '../services/authApi.ts';
import { PASSWORD_RULE_TEXT, passwordProblems } from '../utils/passwordRules.ts';

/** O Supabase só deixa enviar um e-mail destes por minuto. */
const RESEND_WAIT_MS = 60_000;

export default function SignupPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const wait = useCountdown(resendAt);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = passwordProblems(password);
    if (password !== confirm) found.push('As senhas não coincidem.');
    setProblems(found);
    if (found.length > 0) return;

    setBusy(true);
    const address = email.trim();
    const result = await signUp(name.trim(), address, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // Mesmo para um e-mail já registado o Supabase responde igual: não se revela quem tem conta.
    setSentTo(address);
    setResendAt(new Date(Date.now() + RESEND_WAIT_MS).toISOString());
  };

  const handleResend = async () => {
    if (!sentTo) return;
    const result = await resendConfirmation(sentTo);
    if (result.ok) {
      setResent(true);
      setResendAt(new Date(Date.now() + RESEND_WAIT_MS).toISOString());
    } else {
      setError(result.message);
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Confirma o teu e-mail">
        <div className="space-y-4">
          <AuthMessage tone="success">
            Enviámos um link para {sentTo}. Abre-o para ativar a conta e depois entra com a tua senha.
          </AuthMessage>
          {resent && <AuthMessage tone="info">Enviámos outro link.</AuthMessage>}
          {error && <AuthMessage tone="error">{error}</AuthMessage>}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={!wait.expired}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {wait.expired ? 'Reenviar link' : `Reenviar link (${wait.label})`}
          </button>
          <p className="text-center text-sm">
            <Link to="/login" className={authLink}>
              Voltar ao login
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar conta" subtitle="Vamos enviar um link para confirmares o teu e-mail.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate={false}>
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        <div>
          <label htmlFor="name" className={authLabel}>
            Nome
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            className={authInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            autoComplete="new-password"
            required
            className={authInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">{PASSWORD_RULE_TEXT}</p>
        </div>
        <div>
          <label htmlFor="confirm" className={authLabel}>
            Confirmar senha
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            className={authInput}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {problems.length > 0 && (
          <AuthMessage tone="error">
            <ul className="list-inside list-disc">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </AuthMessage>
        )}
        <button type="submit" disabled={busy} className={authPrimaryButton}>
          {busy ? 'A criar…' : 'Criar conta'}
        </button>
        <p className="text-center text-sm text-gray-600">
          <Link to="/login" className={authLink}>
            Já tenho conta
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
