import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  AuthMessage,
  AuthShell,
  authInput,
  authLabel,
  authLink,
  authPrimaryButton,
} from '../components/auth/AuthShell.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { updatePassword } from '../services/authApi.ts';
import { PASSWORD_RULE_TEXT, passwordProblems } from '../utils/passwordRules.ts';
import { isRecoverySession } from '../utils/sessionMethods.ts';

/** Senha nova, aberta pelo link de recuperação enviado por e-mail. */
export default function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <AuthShell title="Senha nova">
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  // Só o link do e-mail abre esta tela: com uma sessão normal, mudar a senha sem a
  // atual seria um atalho para quem pegasse num aparelho com a sessão aberta.
  if (!isRecoverySession(session?.access_token)) {
    return (
      <AuthShell title="Senha nova">
        <div className="space-y-4">
          <AuthMessage tone="error">O link expirou ou já foi usado.</AuthMessage>
          <p className="text-center text-sm">
            <Link to="/forgot-password" className={authLink}>
              Pedir outro link
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = passwordProblems(password);
    if (password !== confirm) found.push('As senhas não coincidem.');
    setProblems(found);
    if (found.length > 0) return;
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    void navigate('/', { replace: true });
  };

  return (
    <AuthShell title="Senha nova" subtitle="Escolhe a senha que vais usar a partir de agora.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        <div>
          <label htmlFor="password" className={authLabel}>
            Nova senha
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
          {busy ? 'A guardar…' : 'Guardar senha'}
        </button>
      </form>
    </AuthShell>
  );
}
