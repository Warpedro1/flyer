import { type FormEvent, useState } from 'react';

import { updateMyNickname } from '../../services/flyerApi.ts';
import { formatApiError } from '../../utils/apiError.ts';
import { DataSection, SaveMessage, dataInput, dataPrimaryButton, dataSecondaryButton } from './DataSection.tsx';

/** O vulgo: como as pessoas te conhecem; opcional (Warpedro1/flyer-back#32). */
export function NicknameSection({ current, onSaved }: { current: string | null; onSaved: () => void }) {
  const [nickname, setNickname] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const trimmed = nickname.trim();

  const send = async (value: string | null) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateMyNickname(value);
      if (value === null) setNickname('');
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    void send(trimmed || null);
  };

  return (
    <DataSection title="Vulgo" hint="Como as pessoas te conhecem. Aparece junto do seu @usuário. Opcional.">
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="my-nickname" className="sr-only">
          Vulgo
        </label>
        <input
          id="my-nickname"
          className={dataInput}
          value={nickname}
          maxLength={40}
          placeholder="Ex.: Aninha do Frevo"
          onChange={(e) => {
            setNickname(e.target.value);
            setSaved(false);
          }}
        />
        <button type="submit" disabled={busy || trimmed === (current ?? '')} className={dataPrimaryButton}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
        {current && (
          <button type="button" disabled={busy} onClick={() => void send(null)} className={dataSecondaryButton}>
            Remover
          </button>
        )}
      </form>
      <SaveMessage error={error} saved={saved} />
    </DataSection>
  );
}
