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
import { useCountdown } from '../hooks/useCountdown.ts';
import { resendConfirmation, verifySignupCode } from '../services/authApi.ts';
import { activateSignup } from '../services/flyerApi.ts';
import { formatApiError } from '../utils/apiError.ts';
import { clearSignupTicket, readSignupTicket } from '../utils/signupTicket.ts';

/** O Supabase só deixa enviar um e-mail destes por minuto. */
const RESEND_WAIT_MS = 60_000;

/**
 * Último passo do cadastro: o código de 6 dígitos enviado por e-mail (decisão
 * 2026-10-14). Só funciona no separador que fez o cadastro, que guarda o bilhete;
 * quem tiver só o código (o e-mail escrito mal) não ativa a conta.
 */
export default function SignupCodePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [ticket] = useState(readSignupTicket);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(() => new Date(Date.now() + RESEND_WAIT_MS).toISOString());
  const wait = useCountdown(resendAt);

  if (!ticket) {
    const handleOtherAccount = async () => {
      await signOut();
      void navigate('/signup', { replace: true });
    };
    return (
      <AuthShell title="Ativar conta">
        <div className="space-y-4">
          <AuthMessage tone="info">
            Por segurança, o código só ativa a conta no separador onde fizeste o cadastro. Se o fechaste,
            faz o cadastro outra vez: enviamos um código novo.
          </AuthMessage>
          <Link to="/signup" className={`${authPrimaryButton} block text-center`}>
            Fazer o cadastro outra vez
          </Link>
          {user && (
            <button
              type="button"
              onClick={() => void handleOtherAccount()}
              className="w-full py-2 text-sm font-medium text-gray-500 hover:text-red-600"
            >
              Usar outra conta
            </button>
          )}
        </div>
      </AuthShell>
    );
  }

  // O código já foi aceite antes (a ativação falhou, por exemplo sem rede): só falta ativar.
  const codeAccepted = Boolean(user?.email) && user?.email === ticket.email;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    if (!codeAccepted) {
      const result = await verifySignupCode(ticket.email, code);
      if (!result.ok) {
        setError(result.message);
        setBusy(false);
        return;
      }
    }
    try {
      await activateSignup(ticket.ticket);
    } catch (err) {
      setError(formatApiError(err));
      setBusy(false);
      return;
    }
    clearSignupTicket();
    void navigate('/', { replace: true });
  };

  const handleResend = async () => {
    setError(null);
    setResendAt(new Date(Date.now() + RESEND_WAIT_MS).toISOString());
    const result = await resendConfirmation(ticket.email);
    if (result.ok) {
      setNotice('Enviámos um código novo.');
    } else {
      setError(result.message);
    }
  };

  const handleFixEmail = () => {
    clearSignupTicket();
    void navigate('/signup', { replace: true });
  };

  return (
    <AuthShell
      title="Ativar conta"
      subtitle={`Enviámos um código de 6 dígitos para ${ticket.email}. Ele vale por 10 minutos.`}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        {notice && <AuthMessage tone="success">{notice}</AuthMessage>}
        {codeAccepted ? (
          <AuthMessage tone="info">O código já foi aceite. Falta só ativar a conta.</AuthMessage>
        ) : (
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
        )}
        <button
          type="submit"
          disabled={busy || (!codeAccepted && code.length !== 6)}
          className={authPrimaryButton}
        >
          {busy ? 'A ativar…' : 'Ativar conta'}
        </button>
      </form>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        {!codeAccepted && (
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={!wait.expired}
            className="rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {wait.expired ? 'Reenviar código' : `Reenviar código (${wait.label})`}
          </button>
        )}
        <button
          type="button"
          onClick={handleFixEmail}
          className={`py-2 font-medium ${authLink}`}
        >
          Corrigir e-mail
        </button>
      </div>
    </AuthShell>
  );
}
