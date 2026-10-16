import { afterEach, describe, expect, it, vi } from 'vitest';

import { isChunkLoadError, reloadOnce } from './chunkReload.ts';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://flyer/assets/x.js',
    'Importing a module script failed.',
    'error loading dynamically imported module',
    'Unable to preload CSS for /assets/index.css',
  ])('reconhece "%s"', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('um erro qualquer não é de chunk', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(false);
    expect(isChunkLoadError('texto')).toBe(false);
  });
});

describe('reloadOnce', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('recarrega uma vez e, logo a seguir, já não', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
    const reload = vi.fn();

    expect(reloadOnce(reload)).toBe(true);
    vi.setSystemTime(new Date('2026-10-16T12:00:05Z'));
    expect(reloadOnce(reload)).toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('passado um bocado volta a poder recarregar (deploy seguinte)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
    const reload = vi.fn();

    reloadOnce(reload);
    vi.setSystemTime(new Date('2026-10-16T12:01:00Z'));

    expect(reloadOnce(reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('sem sessionStorage não recarrega em ciclo', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const reload = vi.fn();

    expect(reloadOnce(reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
