import { describe, expect, it } from 'vitest';

import { sessionMethods } from './sessionMethods.ts';

function token(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.assinatura`;
}

describe('sessionMethods', () => {
  it('lê os métodos de login do token (amr)', () => {
    expect(sessionMethods(token({ amr: [{ method: 'password', timestamp: 1 }] }))).toEqual(['password']);
    expect(sessionMethods(token({ amr: [{ method: 'recovery' }, { method: 'otp' }] }))).toEqual([
      'recovery',
      'otp',
    ]);
  });

  it('um token sem amr ou inválido não tem métodos', () => {
    expect(sessionMethods(token({ sub: 'u' }))).toEqual([]);
    expect(sessionMethods('lixo')).toEqual([]);
    expect(sessionMethods(undefined)).toEqual([]);
  });
});
