import type { DiscoveryMode } from '../types/index.ts';

/** Lê o header `X-Discovery-Mode`. Sem header (backend antigo) conta como personalizado. */
export function parseDiscoveryMode(value: unknown): DiscoveryMode {
  return value === 'nearby' ? 'nearby' : 'personalized';
}
