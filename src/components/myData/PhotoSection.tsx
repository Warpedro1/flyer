import { type ChangeEvent, useId, useState } from 'react';

import { removeMyAvatar, setMyAvatar } from '../../services/flyerApi.ts';
import { removeAvatarUpload, uploadAvatar } from '../../services/storage.ts';
import { formatApiError, getApiErrorInfo } from '../../utils/apiError.ts';
import { resizeToSquare } from '../../utils/resizeImage.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { DataSection, SaveMessage, dataSecondaryButton } from './DataSection.tsx';

/**
 * A foto de perfil (Warpedro1/flyer-back#24): reduzida aqui para 512×512, enviada para a
 * pasta da pessoa e só usada depois da moderação do backend. Todos com conta a veem.
 */
export function PhotoSection({
  userId,
  avatarUrl,
  label,
  onChanged,
}: {
  userId: string;
  avatarUrl: string | null;
  label: string;
  onChanged: (avatarUrl: string | null) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const run = async (work: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      onChanged(await work());
      setSaved(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Escolher a mesma foto de novo tem de disparar outra vez.
    e.target.value = '';
    if (!file) return;
    void run(async () => {
      const photo = await resizeToSquare(file);
      const path = await uploadAvatar(userId, photo);
      try {
        return (await setMyAvatar(path)).avatar_url;
      } catch (err) {
        // O backend respondeu que não usou a foto: ela sai do bucket. Sem resposta, fica
        // (ele pode tê-la salvado); no pior caso, um arquivo que ninguém vê.
        if (getApiErrorInfo(err).status !== null) void removeAvatarUpload(path);
        throw err;
      }
    });
  };

  return (
    <DataSection title="Foto de perfil" hint="Todos com conta no Flyer veem sua foto.">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar url={avatarUrl} label={label} className="h-20 w-20 text-2xl" />
        <div className="flex flex-wrap gap-2">
          {/* O nome do campo é o texto do botão (o label): o que se vê é o que o leitor de tela diz. */}
          <input id={inputId} type="file" accept="image/*" className="peer sr-only" disabled={busy} onChange={pick} />
          <label
            htmlFor={inputId}
            className={`${dataSecondaryButton} cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-red-600 peer-focus-visible:ring-offset-2 ${busy ? 'pointer-events-none opacity-50' : ''}`}
          >
            {busy ? 'Enviando…' : avatarUrl ? 'Trocar foto' : 'Enviar foto'}
          </label>
          {avatarUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await removeMyAvatar();
                  return null;
                })
              }
              className={dataSecondaryButton}
            >
              Remover foto
            </button>
          )}
        </div>
      </div>
      <SaveMessage error={error} saved={saved} />
    </DataSection>
  );
}
