import axios from 'axios';

export function formatApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : 'Erro desconhecido.';
  }
  const raw = err.response?.data as { detail?: unknown } | undefined;
  const detail = raw?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return JSON.stringify(detail);
  return err.message;
}
