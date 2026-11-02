import { type FormEvent, useState } from 'react';

import { useUsernameCheck } from '../../hooks/useUsernameCheck.ts';
import { updateMyUsername } from '../../services/flyerApi.ts';
import { formatApiError } from '../../utils/apiError.ts';
import { normalizeUsername } from '../../utils/usernames.ts';
import { UsernameHint } from '../ui/UsernameHint.tsx';
import { DataSection, SaveMessage, dataInput, dataPrimaryButton } from './DataSection.tsx';

function localDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });
}

/** O @usuário público: troca uma vez a cada 30 dias (Warpedro1/flyer-back#32). */
export function UsernameSection({
  current,
  availableAt,
  onSaved,
}: {
  current: string;
  availableAt: string | null;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const check = useUsernameCheck(draft, current);
  const locked = availableAt !== null;
  const changed = draft !== current && draft.length > 0;
  // Sem resposta da conferência, quem decide é o backend; uma recusa conhecida trava o botão.
  const refused = check !== null && !check.available;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateMyUsername(draft);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DataSection
      title="@usuário"
      hint="É assim que as pessoas te encontram. Você pode trocar uma vez a cada 30 dias; o @ antigo fica livre para outras pessoas."
    >
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
          <label htmlFor="my-username" className="sr-only">
            @usuário
          </label>
          <input
            id="my-username"
            className={`${dataInput} pl-8`}
            value={draft}
            maxLength={20}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            disabled={locked}
            onChange={(e) => {
              setDraft(normalizeUsername(e.target.value));
              setSaved(false);
            }}
          />
        </div>
        <button type="submit" disabled={locked || busy || !changed || refused} className={dataPrimaryButton}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
      {locked && availableAt && (
        <p className="mt-2 text-sm text-gray-600">Você poderá trocar de novo em {localDate(availableAt)}.</p>
      )}
      {!locked && changed && <UsernameHint check={check} onUse={setDraft} />}
      <SaveMessage error={error} saved={saved} />
    </DataSection>
  );
}
