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
import { sendPasswordReset } from '../services/authApi.ts';

const RATE_LIMITED = new Set(['over_email_send_rate_limit', 'over_request_rate_limit']);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const address = email.trim();
    const result = await sendPasswordReset(address);
    setBusy(false);
    // Só o limite de pedidos se mostra: tudo o resto tem a mesma resposta, para não
    // revelar que e-mails têm conta.
    if (!result.ok && RATE_LIMITED.has(result.code)) {
      setError(result.message);
      return;
    }
    void navigate(`/reset-password?email=${encodeURIComponent(address)}`);
  };

  return (
    <AuthShell title="Esqueci a senha" subtitle="Vamos enviar um código de 6 dígitos para você criar uma senha nova.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
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
        <button type="submit" disabled={busy} className={authPrimaryButton}>
          {busy ? 'Enviando…' : 'Enviar código'}
        </button>
        <p className="text-center text-sm">
          <Link to="/login" className={authLink}>
            Voltar ao login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
