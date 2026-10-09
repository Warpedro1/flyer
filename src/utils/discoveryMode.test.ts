import { describe, expect, it } from 'vitest';

import { parseDiscoveryMode } from './discoveryMode.ts';

describe('parseDiscoveryMode', () => {
  it('reconhece o modo de proximidade', () => {
    expect(parseDiscoveryMode('nearby')).toBe('nearby');
  });

  it('reconhece o modo personalizado', () => {
    expect(parseDiscoveryMode('personalized')).toBe('personalized');
  });

  it('sem header (backend antigo) assume personalizado, para não mostrar um aviso falso', () => {
    expect(parseDiscoveryMode(undefined)).toBe('personalized');
    expect(parseDiscoveryMode('outra-coisa')).toBe('personalized');
  });
});
