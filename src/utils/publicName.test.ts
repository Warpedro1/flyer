import { describe, expect, it } from 'vitest';

import { initialsOf, publicName } from './publicName.ts';

describe('publicName', () => {
  it('mostra o vulgo com o @usuário', () => {
    expect(publicName({ username: 'ana.lima', nickname: 'Aninha' })).toBe('Aninha (@ana.lima)');
  });

  it('mostra só o @usuário sem vulgo', () => {
    expect(publicName({ username: 'ana.lima', nickname: null })).toBe('@ana.lima');
  });

  it('cai no texto padrão sem identidade', () => {
    expect(publicName({ username: null, nickname: null })).toBe('Participante');
    expect(publicName(null, 'Sem nome')).toBe('Sem nome');
  });
});

describe('initialsOf', () => {
  it.each([
    ['Aninha do Frevo', 'AD'],
    ['@ana.lima', 'AL'],
    ['ana_b', 'AB'],
    ['Zé', 'ZÉ'],
    ['bia', 'BI'],
    ['', '?'],
    ['@', '?'],
  ])('%s → %s', (label, expected) => {
    expect(initialsOf(label)).toBe(expected);
  });
});
