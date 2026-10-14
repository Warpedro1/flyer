import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSignupTicket, readSignupTicket, saveSignupTicket } from './signupTicket.ts';

const KEY = 'flyer.signupTicket';

describe('signupTicket', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('guarda o bilhete e o e-mail neste navegador (localStorage), para qualquer separador', () => {
    saveSignupTicket({ ticket: 't'.repeat(43), email: 'ana@example.com' });

    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(readSignupTicket()).toEqual({ ticket: 't'.repeat(43), email: 'ana@example.com' });
  });

  it('sem bilhete devolve null', () => {
    expect(readSignupTicket()).toBeNull();
  });

  it('limpar apaga o bilhete', () => {
    saveSignupTicket({ ticket: 't'.repeat(43), email: 'ana@example.com' });

    clearSignupTicket();

    expect(readSignupTicket()).toBeNull();
  });

  it('passadas 24 h o bilhete já não conta e é apagado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    saveSignupTicket({ ticket: 't'.repeat(43), email: 'ana@example.com' });

    vi.setSystemTime(new Date('2026-10-15T11:59:00Z'));
    expect(readSignupTicket()).not.toBeNull();

    vi.setSystemTime(new Date('2026-10-15T12:01:00Z'));
    expect(readSignupTicket()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('um valor estragado conta como sem bilhete', () => {
    localStorage.setItem(KEY, '{nao é json');

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
