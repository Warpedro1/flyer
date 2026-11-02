import { type FormEvent, useState } from 'react';

import { completeProfileIdentity } from '../../services/flyerApi.ts';
import { formatApiError } from '../../utils/apiError.ts';
import { formatCpfInput, formatPhoneInput, identityProblems } from '../../utils/brDocuments.ts';
import { DataSection, dataInput, dataPrimaryButton } from './DataSection.tsx';

/**
 * CPF (obrigatório) e celular (opcional) de uma conta que ainda não os tem: contas Google
 * no 1.º acesso (decisões 2026-10-12, Warpedro1/flyer-back#29). O CPF não muda depois.
 */
export function IdentitySection({ onCompleted }: { onCompleted: () => void }) {
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = identityProblems(cpf, phone);
    setProblems(found);
    if (found.length > 0) return;
    setBusy(true);
    try {
      await completeProfileIdentity({ cpf, ...(phone.trim() ? { phone } : {}) });
      onCompleted();
    } catch (err) {
      setError(formatApiError(err));
      setBusy(false);
    }
  };

  return (
    <DataSection title="Documento e celular" hint="O CPF é obrigatório e não muda depois. O celular é opcional. Só você vê.">
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <div>
          <label htmlFor="identity-cpf" className="block text-sm font-medium text-gray-700">
            CPF
          </label>
          <input
            id="identity-cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="000.000.000-00"
            className={`mt-1 ${dataInput}`}
            value={cpf}
            onChange={(e) => setCpf(formatCpfInput(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="identity-phone" className="block text-sm font-medium text-gray-700">
            Celular <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            id="identity-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(81) 91234-5678"
            className={`mt-1 ${dataInput}`}
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          />
        </div>
        {problems.length > 0 && (
          <ul role="alert" className="list-inside list-disc text-sm text-red-700">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`w-full ${dataPrimaryButton}`}>
          {busy ? 'Salvando…' : 'Continuar'}
        </button>
      </form>
    </DataSection>
  );
}
