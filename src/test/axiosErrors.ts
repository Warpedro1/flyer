import { AxiosError, AxiosHeaders } from 'axios';

/** Um erro do axios como o que a API devolve (status, corpo e cabeçalhos). */
export function apiResponseError(
  status: number,
  data: unknown,
  responseHeaders: Record<string, string> = {},
): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', { headers }, null, {
    status,
    statusText: '',
    headers: responseHeaders,
    config: { headers },
    data,
  });
}

/** Sem resposta: rede em baixo ou um 500 sem CORS (o browser não o deixa ler). */
export function networkError(): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Network Error', 'ERR_NETWORK', { headers }, {});
}
