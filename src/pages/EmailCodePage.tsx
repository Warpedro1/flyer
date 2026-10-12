import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import {
  AuthMessage,
  AuthShell,
  authInput,
  authLabel,
  authPrimaryButton,
} from '../components/auth/AuthShell.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { useCountdown } from '../hooks/useCountdown.ts';
import { sendEmailCode, verifyEmailCode } from '../services/flyerApi.ts';
import { formatApiError } from '../utils/apiError.ts';
import { sessionNeedsEmailCode } from '../utils/sessionMethods.ts';

const RESEND_WAIT_MS = 60_000;

/** Segundo passo do login com senha: o código de 6 dígitos enviado por e-mail. */
export default function EmailCodePage() {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<string | null>(null);
  const wait = useCountdown(resendAt);
  const needsCode = Boolean(user) && sessionNeedsEmailCode(session?.access_token);
  // O React (StrictMode) corre os efeitos duas vezes em desenvolvimento: um envio só.
  const sentOnce = useRef(false);

  useEffect(() => {
    if (!needsCode || sentOnce.current) return;
    sentOnce.current = true;
    let cancelled = false;
    setResendAt(new Date(Date.now() + RESEND_WAIT_MS).toISOString());
    sendEmailCode().catch((err: unknown) => {
      if (!cancelled) setError(formatApiError(err));
    });
    return () => {
      cancelled = true;
    };
  }, [needsCode]);

  if (loading) {
    return (
      <AuthShell title="Código de acesso">
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </AuthShell>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!needsCode) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await verifyEmailCode(code);
      void navigate('/', { replace: true });
    } catch (err) {
      setError(formatApiError(err));
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendAt(new Date(Date.now() + RESEND_WAIT_MS).toISOString());
    try {
      await sendEmailCode();
      setNotice('Enviámos um código novo.');
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleOtherAccount = async () => {
    await signOut();
    void navigate('/login', { replace: true });
  };

  return (
    <AuthShell
      title="Código de acesso"
      subtitle={`Enviámos um código de 6 dígitos para ${user.email ?? 'o teu e-mail'}. Ele vale por 10 minutos.`}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {notice && <AuthMessage tone="success">{notice}</AuthMessage>}
        <div>
          <label htmlFor="code" className={authLabel}>
            Código
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            className={`${authInput} text-center font-mono text-2xl tracking-[0.5em]`}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        <button type="submit" disabled={busy || code.length !== 6} className={authPrimaryButton}>
          {busy ? 'A confirmar…' : 'Confirmar'}
        </button>
      </form>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={!wait.expired}
          className="rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {wait.expired ? 'Reenviar código' : `Reenviar código (${wait.label})`}
        </button>
        <button
          type="button"
          onClick={() => void handleOtherAccount()}
          className="py-2 font-medium text-gray-500 hover:text-red-600"
        >
          Usar outra conta
        </button>
      </div>
    </AuthShell>
  );
}
