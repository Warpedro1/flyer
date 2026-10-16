import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearOnboardingDraft, readOnboardingDraft, saveOnboardingDraft } from './onboardingDraft.ts';

describe('onboardingDraft', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('guarda as respostas por utilizador nesta aba', () => {
    saveOnboardingDraft('user-1', { free_time: 'Praia' });

    expect(readOnboardingDraft('user-1')).toEqual({ free_time: 'Praia' });
    expect(readOnboardingDraft('user-2')).toEqual({});
  });

  it('limpar apaga as respostas', () => {
    saveOnboardingDraft('user-1', { free_time: 'Praia' });

    clearOnboardingDraft('user-1');

    expect(readOnboardingDraft('user-1')).toEqual({});
  });

  it('um valor estragado conta como vazio', () => {
    sessionStorage.setItem('flyer.onboardingAnswers.user-1', '{nao é json');

    expect(readOnboardingDraft('user-1')).toEqual({});
  });

  it('sem armazenamento não rebenta', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => saveOnboardingDraft('user-1', { free_time: 'Praia' })).not.toThrow();
    expect(readOnboardingDraft('user-1')).toEqual({});
  });
});
