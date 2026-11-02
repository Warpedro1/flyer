import { describe, expect, it } from 'vitest';

import { normalizeUsername, usernameFromName } from './usernames.ts';

describe('normalizeUsername', () => {
  it.each([
    ['@Ana.Lima', 'ana.lima'],
    [' ana b ', 'anab'],
    ['@@bia', 'bia'],
  ])('%s → %s', (typed, stored) => {
    expect(normalizeUsername(typed)).toBe(stored);
  });
});

describe('usernameFromName', () => {
  it.each([
    ['Ana Lima', 'ana.lima'],
    ["D'Ávila", 'd.avila'],
    ['João Ção Müller', 'joao.cao.muller'],
    ['José da Silva Xavier Pereira', 'jose.da.silva.x'],
    ['Turma 2026', 'turma'],
    ['  ', ''],
    ['😀', ''],
  ])('%s → %s', (name, expected) => {
    expect(usernameFromName(name)).toBe(expected);
  });
});
