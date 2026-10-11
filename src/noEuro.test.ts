import { describe, expect, it } from 'vitest';

// A app é em reais (decisão de 2026-10-11). Qualquer "€" que sobre no código aparece
// a alguém. Os testes ficam de fora: podem citar o € para provar que ele não aparece.
const sources = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('moeda', () => {
  it('nenhum ficheiro da app mostra o símbolo do euro', () => {
    const withEuro = Object.entries(sources)
      .filter(([, text]) => text.includes('€'))
      .map(([path]) => path);

    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(withEuro).toEqual([]);
  });
});
