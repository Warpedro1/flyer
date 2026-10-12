import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import {
  AuthMessage,
  AuthShell,
  authInput,
  authLabel,
  authPrimaryButton,
} from '../components/auth/AuthShell.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { completeProfileIdentity } from '../services/flyerApi.ts';
import { formatApiError } from '../utils/apiError.ts';
import { formatCpfInput, formatPhoneInput, identityProblems } from '../utils/brDocuments.ts';

/** 1.º acesso de uma conta sem CPF e celular (Google): completar antes de usar a app. */
export default function CompleteProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <AuthShell title="Completa o teu cadastro">
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      </AuthShell>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = identityProblems(cpf, phone);
    setProblems(found);
    if (found.length > 0) return;
    setBusy(true);
    try {
      await completeProfileIdentity({ cpf, phone });
      void navigate('/', { replace: true });
    } catch (err) {
      setError(formatApiError(err));
      setBusy(false);
    }
  };

  const handleOtherAccount = async () => {
    await signOut();
    void navigate('/login', { replace: true });
  };

  return (
    <AuthShell
      title="Completa o teu cadastro"
      subtitle="Para usar o Flyer precisamos do teu CPF e do teu celular. Só tu vês estes dados."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
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
          {busy ? 'A guardar…' : 'Continuar'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => void handleOtherAccount()}
        className="mt-4 w-full py-2 text-sm font-medium text-gray-500 hover:text-red-600"
      >
        Usar outra conta
      </button>
    </AuthShell>
  );
}
