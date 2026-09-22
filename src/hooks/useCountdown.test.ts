import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from './useCountdown.ts';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('conta os segundos que faltam até ao instante dado', () => {
    const { result } = renderHook(() => useCountdown('2026-09-21T10:01:30Z'));

    expect(result.current.secondsLeft).toBe(90);
    expect(result.current.label).toBe('1:30');
    expect(result.current.expired).toBe(false);
  });

  it('avança sozinho com o relógio', () => {
    const { result } = renderHook(() => useCountdown('2026-09-21T10:00:10Z'));

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.secondsLeft).toBe(6);
  });

  it('marca como expirado quando o instante já passou, sem ir a negativo', () => {
    const { result } = renderHook(() => useCountdown('2026-09-21T09:59:00Z'));

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.expired).toBe(true);
    expect(result.current.label).toBe('0:00');
  });

  it('sem instante não conta nada nem marca expirado', () => {
    const { result } = renderHook(() => useCountdown(null));

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.expired).toBe(false);
    expect(result.current.label).toBe('');
  });

  it('para o intervalo ao desmontar', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useCountdown('2026-09-21T10:05:00Z'));

    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
