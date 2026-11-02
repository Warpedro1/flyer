import { type FormEvent, useState } from 'react';

import { updateMyPhone } from '../../services/flyerApi.ts';
import { formatApiError } from '../../utils/apiError.ts';
import { formatPhoneInput, isValidMobile } from '../../utils/brDocuments.ts';
import { DataSection, SaveMessage, dataInput, dataPrimaryButton, dataSecondaryButton } from './DataSection.tsx';

/** O celular: opcional, único e só a própria pessoa vê, mascarado (Warpedro1/flyer-back#29). */
export function PhoneSection({ masked, onSaved }: { masked: string | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const send = async (value: string | null) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateMyPhone(value);
      setSaved(true);
      setEditing(false);
      setConfirmingRemoval(false);
      setPhone('');
      onSaved();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidMobile(phone)) {
      setError('Celular inválido: DDD + número com 9 dígitos.');
      return;
    }
    void send(phone);
  };

  return (
    <DataSection title="Celular" hint="Opcional. Só você vê.">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm text-gray-900">{masked ?? 'Não informado'}</span>
        {!editing && !confirmingRemoval && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setSaved(false);
                setError(null);
              }}
              className={dataSecondaryButton}
            >
              {masked ? 'Trocar' : 'Incluir'}
            </button>
            {masked && (
              <button type="button" onClick={() => setConfirmingRemoval(true)} className={dataSecondaryButton}>
                Remover
              </button>
            )}
          </div>
        )}
      </div>
      {confirmingRemoval && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
          <span>Remover o celular da sua conta?</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmingRemoval(false)} className={dataSecondaryButton}>
              Cancelar
            </button>
            <button type="button" disabled={busy} onClick={() => void send(null)} className={dataPrimaryButton}>
              Sim, remover
            </button>
          </div>
        </div>
      )}
      {editing && (
        <form onSubmit={save} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="my-phone" className="sr-only">
            Novo celular
          </label>
          <input
            id="my-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(81) 91234-5678"
            className={dataInput}
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          />
          <button type="submit" disabled={busy} className={dataPrimaryButton}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={dataSecondaryButton}>
            Cancelar
          </button>
        </form>
      )}
      <SaveMessage error={error} saved={saved} />
    </DataSection>
  );
}
