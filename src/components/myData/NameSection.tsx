import { type FormEvent, useState } from 'react';

import { updateMyName } from '../../services/flyerApi.ts';
import { formatApiError } from '../../utils/apiError.ts';
import { DataSection, SaveMessage, dataInput, dataPrimaryButton } from './DataSection.tsx';

/** O nome completo: só a própria pessoa vê (decisão 2026-11-01). */
export function NameSection({ current }: { current: string | null }) {
  const [name, setName] = useState(current ?? '');
  // O que está salvo agora (a tela não recarrega o perfil depois de salvar o nome).
  const [savedName, setSavedName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const trimmed = name.trim();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateMyName(trimmed);
      setSavedName(trimmed);
      setSaved(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DataSection title="Nome completo" hint="Só você vê.">
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="my-name" className="sr-only">
          Nome completo
        </label>
        <input
          id="my-name"
          className={dataInput}
          value={name}
          maxLength={100}
          autoComplete="name"
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
        <button type="submit" disabled={busy || !trimmed || trimmed === savedName} className={dataPrimaryButton}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
      <SaveMessage error={error} saved={saved} />
    </DataSection>
  );
}
