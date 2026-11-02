import type { UsernameAvailability } from '../../types/index.ts';
import { usernameRefusal } from '../../utils/usernames.ts';

/**
 * O que a conferência do @usuário disse, com o botão da sugestão quando há uma. A região
 * existe sempre, mesmo vazia: o leitor de tela só anuncia o que muda dentro de uma região
 * que já estava na tela. O campo aponta para ela com `aria-describedby={id}`.
 */
export function UsernameHint({
  id,
  check,
  onUse,
}: {
  id: string;
  check: UsernameAvailability | null;
  onUse: (suggestion: string) => void;
}) {
  return (
    <div id={id} aria-live="polite" className="text-sm">
      {check?.available && <p className="mt-2 text-green-700">Disponível.</p>}
      {check && !check.available && (
        <div className="mt-2 text-red-700">
          <p>{usernameRefusal(check)}</p>
          {check.suggestion && (
            <button
              type="button"
              onClick={() => onUse(check.suggestion as string)}
              className="mt-1 font-semibold text-red-600 underline-offset-2 hover:underline"
            >
              Usar @{check.suggestion}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
