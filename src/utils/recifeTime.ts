/**
 * Hora de Recife (UTC−03:00, sem horário de verão).
 *
 * Os eventos acontecem em Recife: as horas mostram-se e escrevem-se em hora de Recife,
 * seja qual for o fuso do aparelho. O backend devolve em UTC e aceita horas sem fuso
 * como hora de Recife.
 */

const OFFSET_MS = -3 * 60 * 60 * 1000;

function recifeParts(iso: string | null): Date | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  // Um Date "deslocado": os getters UTC passam a dar a hora de Recife.
  return new Date(ms + OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Valor para um <input type="datetime-local"> em hora de Recife ("2026-10-16T20:00"). */
export function isoToRecifeInput(iso: string | null): string {
  const d = recifeParts(iso);
  if (!d) return '';
  return `${String(d.getUTCFullYear())}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}`;
}

/** "20:05" */
export function formatRecifeTime(iso: string | null): string {
  const d = recifeParts(iso);
  return d ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : '';
}

/** "20:05 de 16/10" */
export function formatRecifeDayTime(iso: string | null): string {
  const d = recifeParts(iso);
  return d ? `${formatRecifeTime(iso)} de ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}` : '';
}
