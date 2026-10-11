import { describe, expect, it } from 'vitest';

import { FALLBACK_GEO } from './constants.ts';

describe('posição aproximada', () => {
  it('sem GPS a descoberta começa em Recife, a cidade do piloto', () => {
    expect(FALLBACK_GEO.label).toMatch(/recife/i);
    expect(FALLBACK_GEO.latitude).toBeCloseTo(-8.063, 2);
    expect(FALLBACK_GEO.longitude).toBeCloseTo(-34.871, 2);
  });
});
