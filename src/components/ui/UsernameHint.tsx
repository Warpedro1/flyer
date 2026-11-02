import type { UsernameAvailability } from '../../types/index.ts';
import { usernameRefusal } from '../../utils/usernames.ts';

/** O que a conferência do @usuário disse, com o botão da sugestão quando há uma. */
export function UsernameHint({
  check,
  onUse,
}: {
  check: UsernameAvailability | null;
  onUse: (suggestion: string) => void;
}) {
  if (!check) return null;
  if (check.available) {
    return (
      <p role="status" className="mt-2 text-sm text-green-700">
        Disponível.
      </p>
    );
  }
  return (
    <div role="status" className="mt-2 text-sm text-red-700">
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
  );
}

