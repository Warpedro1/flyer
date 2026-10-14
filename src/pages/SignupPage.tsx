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
import { signUpWithEmail } from '../services/flyerApi.ts';
import { formatApiError } from '../utils/apiError.ts';
import { formatCpfInput, formatPhoneInput, identityProblems } from '../utils/brDocuments.ts';
import { PASSWORD_RULE_TEXT, passwordProblems } from '../utils/passwordRules.ts';
import { saveSignupTicket } from '../utils/signupTicket.ts';

export default function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = [...identityProblems(cpf, phone), ...passwordProblems(password)];
    if (password !== confirm) found.push('As senhas não coincidem.');
    setProblems(found);
    if (found.length > 0) return;

    setBusy(true);
    const address = email.trim();
    try {
      // Pelo backend: valida e diz se o e-mail, o CPF ou o celular já têm conta.
      const { ticket } = await signUpWithEmail({ name: name.trim(), email: address, cpf, phone, password });
      // O código do e-mail só ativa a conta neste separador (decisão 2026-10-14).
      saveSignupTicket({ ticket, email: address.toLowerCase() });
    } catch (err) {
      setError(formatApiError(err));
      setBusy(false);
      return;
    }
    void navigate('/signup/code', { replace: true });
  };

  return (
    <AuthShell title="Criar conta" subtitle="Vamos enviar um código de 6 dígitos para confirmares o teu e-mail.">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate={false}>
        {error && (
          <AuthMessage tone="error">
            {error}{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              Esqueci a senha
            </Link>
          </AuthMessage>
        )}
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
          <label htmlFor="cpf" className={authLabel}>
            CPF
          </label>
          <input
            id="cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="000.000.000-00"
            className={authInput}
            value={cpf}
            onChange={(e) => setCpf(formatCpfInput(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="phone" className={authLabel}>
            Celular
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            placeholder="(81) 91234-5678"
            className={authInput}
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          />
          <p className="mt-1 text-xs text-gray-500">O CPF e o celular só tu vês. Cada um só pode ter uma conta.</p>
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
