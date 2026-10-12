import { describe, expect, it } from 'vitest';

import { passwordProblems } from './passwordRules.ts';

// Decisão 2026-10-12: 8+ caracteres, com pelo menos uma letra e um número.
describe('passwordProblems', () => {
  it('aceita uma senha com 8+ caracteres, letras e números', () => {
    expect(passwordProblems('frevo2026')).toEqual([]);
    expect(passwordProblems('Ção12345')).toEqual([]);
  });

  it('diz o que falta', () => {
    expect(passwordProblems('ab1')).toEqual(['Pelo menos 8 caracteres']);
    expect(passwordProblems('12345678')).toEqual(['Pelo menos uma letra']);
    expect(passwordProblems('abcdefgh')).toEqual(['Pelo menos um número']);
    expect(passwordProblems('')).toEqual([
      'Pelo menos 8 caracteres',
      'Pelo menos uma letra',
      'Pelo menos um número',
    ]);
  });
});
