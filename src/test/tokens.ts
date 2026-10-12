/** Um access token falso com os métodos de login (`amr`) pedidos. Sem assinatura válida. */
export function fakeAccessToken(methods: string[], extra: Record<string, unknown> = {}): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = { sub: 'user-1', amr: methods.map((method) => ({ method, timestamp: 1 })), ...extra };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.assinatura`;
}
