import { describe, expect, it } from 'vitest';

import { getFirstNameFromUserMetadata, getGuideIntroMessage } from './chatGuide.ts';

describe('getFirstNameFromUserMetadata', () => {
  it('prefere given_name', () => {
    expect(
      getFirstNameFromUserMetadata({
        given_name: '  João  ',
        full_name: 'Maria Costa',
      }),
    ).toBe('João');
  });

  it('usa a primeira palavra de full_name', () => {
    expect(getFirstNameFromUserMetadata({ full_name: 'Ana Beatriz Souza' })).toBe('Ana');
  });

  it('aceita name quando full_name falta', () => {
    expect(getFirstNameFromUserMetadata({ name: 'Pedro Lima' })).toBe('Pedro');
  });

  it('retorna null sem dados', () => {
    expect(getFirstNameFromUserMetadata({})).toBeNull();
    expect(getFirstNameFromUserMetadata(null)).toBeNull();
  });
});

describe('getGuideIntroMessage', () => {
  it('personaliza com o primeiro nome', () => {
    expect(getGuideIntroMessage('Maria')).toContain('Maria');
    expect(getGuideIntroMessage('Maria')).toMatch(/^Olá, Maria!/);
  });

  it('usa saudação genérica sem nome', () => {
    expect(getGuideIntroMessage(null)).toMatch(/^Olá!/);
    expect(getGuideIntroMessage(null)).not.toContain('Olá,');
  });
});
