import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import {
  AuthMessage,
  AuthShell,
  authInput,
  authLabel,
  authLink,
  authPrimaryButton,
} from '../components/auth/AuthShell.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { sendPasswordReset, updatePassword, verifyRecoveryCode } from '../services/authApi.ts';
import { PASSWORD_RULE_TEXT, passwordProblems } from '../utils/passwordRules.ts';
import { isRecoverySession } from '../utils/sessionMethods.ts';

const RATE_LIMITED = new Set(['over_email_send_rate_limit', 'over_request_rate_limit']);

/**
 * Senha nova com o código de 6 dígitos enviado por e-mail (#43). Um link de uso único
 * seria gasto pelos antivírus de e-mail antes de a pessoa clicar.
 */
export default function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sentTo = searchParams.get('email') ?? '';
  const [email, setEmail] = useState(sentTo);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  if (loading) {
    return (
      <AuthShell title="Senha nova">
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </AuthShell>
    );
  }

  // A sessão de recuperação (o código já foi aceito, ou o link de um e-mail anterior a
  // esta mudança) só precisa da senha nova. Qualquer outra sessão precisa do código:
  // mudar a senha sem a atual seria um atalho para quem pegasse um celular com a
  // sessão aberta.
  const needsCode = !isRecoverySession(session?.access_token);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const found = passwordProblems(password);
    if (password !== confirm) found.push('As senhas não coincidem.');
    if (needsCode && !/^\d{6}$/.test(code)) found.push('O código tem 6 dígitos.');
    setProblems(found);
    if (found.length > 0) return;
    setBusy(true);
    if (needsCode) {
      const verified = await verifyRecoveryCode(email.trim(), code);
      if (!verified.ok) {
        setBusy(false);
        setError(verified.message);
        return;
      }
    }
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    void navigate('/', { replace: true });
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    const result = await sendPasswordReset(email.trim());
    setResending(false);
    // Como no pedido inicial, só o limite de pedidos se mostra: não se revela quem tem conta.
    if (!result.ok && RATE_LIMITED.has(result.code)) {
      setError(result.message);
      return;
    }
    setNotice('Enviamos um código novo. Use o mais recente.');
  };

  return (
    <AuthShell title="Senha nova" subtitle="Escolha a senha que você vai usar a partir de agora.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {needsCode && sentTo && (
          <AuthMessage tone="info">
            Se existir uma conta com {sentTo}, enviamos um código de 6 dígitos. Ele vale por 10 minutos.
            Confira também a pasta de spam.
          </AuthMessage>
        )}
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {notice && <AuthMessage tone="success">{notice}</AuthMessage>}
        {needsCode && (
          <>
            {!sentTo && (
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
            )}
            <div>
              <label htmlFor="code" className={authLabel}>
                Código
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className={`${authInput} text-center font-mono text-2xl tracking-[0.5em]`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          </>
        )}
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
          {busy ? 'Salvando…' : 'Salvar senha'}
        </button>
        {needsCode && (
          <p className="flex flex-col items-center gap-2 text-center text-sm">
            <button
              type="button"
              disabled={resending || !email.trim()}
              onClick={() => void handleResend()}
              className={`${authLink} disabled:opacity-50`}
            >
              {resending ? 'Enviando…' : 'Reenviar código'}
            </button>
            <Link to="/login" className={authLink}>
              Voltar ao login
            </Link>
          </p>
        )}
      </form>
    </AuthShell>
  );
}
