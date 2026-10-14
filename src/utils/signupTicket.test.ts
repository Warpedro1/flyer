import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSignupTicket, readSignupTicket, saveSignupTicket } from './signupTicket.ts';

describe('signupTicket', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('guarda o bilhete e o e-mail só neste separador (sessionStorage)', () => {
    saveSignupTicket({ ticket: 't'.repeat(43), email: 'ana@example.com' });

    expect(readSignupTicket()).toEqual({ ticket: 't'.repeat(43), email: 'ana@example.com' });
    expect(localStorage.length).toBe(0);
  });

  it('sem bilhete devolve null', () => {
    expect(readSignupTicket()).toBeNull();
  });

  it('limpar apaga o bilhete', () => {
    saveSignupTicket({ ticket: 't'.repeat(43), email: 'ana@example.com' });

    clearSignupTicket();

    expect(readSignupTicket()).toBeNull();
  });

  it('um valor estragado conta como sem bilhete', () => {
    sessionStorage.setItem('flyer.signupTicket', '{nao é json');

    expect(readSignupTicket()).toBeNull();
  });

  it('sem acesso ao armazenamento não rebenta', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => saveSignupTicket({ ticket: 'x'.repeat(43), email: 'a@b.co' })).not.toThrow();
    expect(readSignupTicket()).toBeNull();
  });
});
