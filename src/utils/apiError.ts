import axios from 'axios';

/** O que a API diz de um erro (#30): `{detail, code, request_id}` e o cabeçalho `X-Request-Id`. */
export interface ApiErrorInfo {
  status: number | null;
  code: string | null;
  requestId: string | null;
  message: string;
}

export const SERVER_FAIL_MESSAGE = 'Estamos com um problema do nosso lado. Tenta de novo daqui a pouco.';
const NETWORK_MESSAGE = 'Sem ligação ao servidor. Verifica a internet e tenta de novo.';
const RATE_LIMIT_MESSAGE = 'Muitos pedidos seguidos. Espera um pouco e tenta de novo.';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function validationMessage(detail: unknown[]): string {
  const first = detail[0] as { msg?: unknown } | undefined;
  const msg = asString(first?.msg);
  return msg ? `Dados inválidos: ${msg.replace(/^Value error, /, '')}` : 'Dados inválidos.';
}

export function getApiErrorInfo(err: unknown): ApiErrorInfo {
  if (!axios.isAxiosError(err)) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    return { status: null, code: null, requestId: null, message };
  }
  const response = err.response;
  if (!response) {
    return { status: null, code: null, requestId: null, message: NETWORK_MESSAGE };
  }
  const data = (response.data ?? {}) as { detail?: unknown; code?: unknown; request_id?: unknown };
  const detail = data.detail;
  const detailCode =
    typeof detail === 'object' && detail !== null && !Array.isArray(detail)
      ? asString((detail as { code?: unknown }).code)
      : null;
  const headers = (response.headers ?? {}) as Record<string, unknown>;
  const status = response.status;

  let message: string;
  if (typeof detail === 'string' && detail) message = detail;
  else if (Array.isArray(detail)) message = validationMessage(detail);
  else if (status === 429) message = RATE_LIMIT_MESSAGE;
  else if (status >= 500) message = SERVER_FAIL_MESSAGE;
  else message = err.message;

  return {
    status,
    code: asString(data.code) ?? detailCode,
    requestId: asString(data.request_id) ?? asString(headers['x-request-id']),
    message,
  };
}

/** " (código: X · ref Y)", para a pessoa nos poder dizer o que viu. Vazio sem nenhum dos dois. */
export function errorReference(info: Pick<ApiErrorInfo, 'code' | 'requestId'>): string {
  const parts = [info.code && `código: ${info.code}`, info.requestId && `ref ${info.requestId}`].filter(Boolean);
  return parts.length ? ` (${parts.join(' · ')})` : '';
}

/** A mensagem a mostrar. Nos erros nossos (5xx) leva o código e a referência. */
export function formatApiError(err: unknown): string {
  const info = getApiErrorInfo(err);
  if (info.status !== null && info.status >= 500) return info.message + errorReference(info);
  return info.message;
}

export function isNotFoundError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}
