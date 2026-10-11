import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppVersionCheck } from './useAppVersionCheck.ts';

function page(script: string): string {
  return `<!doctype html><html><head><script type="module" crossorigin src="${script}"></script></head></html>`;
}

function becomeVisible(): void {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useAppVersionCheck', () => {
  let script: HTMLScriptElement;

  beforeEach(() => {
    // O index.html em produção carrega o bundle com um nome que muda a cada deploy.
    script = document.createElement('script');
    script.type = 'module';
    script.src = '/assets/index-OLD123.js';
    document.head.appendChild(script);
  });

  afterEach(() => {
    script.remove();
    vi.unstubAllGlobals();
  });

  it('quando a app volta ao ecrã e há um deploy novo, recarrega', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(page('/assets/index-NEW456.js')));
    vi.stubGlobal('fetch', fetchMock);
    const reload = vi.fn();

    renderHook(() => useAppVersionCheck(reload));
    becomeVisible();

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/index.html', { cache: 'no-store' });
  });

  it('com a mesma versão não recarrega', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(page('/assets/index-OLD123.js')));
    vi.stubGlobal('fetch', fetchMock);
    const reload = vi.fn();

    renderHook(() => useAppVersionCheck(reload));
    becomeVisible();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(reload).not.toHaveBeenCalled();
  });

  it('sem rede não faz nada (não recarrega em ciclo)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const reload = vi.fn();

    renderHook(() => useAppVersionCheck(reload));
    becomeVisible();
    await new Promise((r) => setTimeout(r, 0));

    expect(reload).not.toHaveBeenCalled();
  });

  it('larga o listener quando o componente sai', () => {
    const remove = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useAppVersionCheck(vi.fn()));
    unmount();

    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    remove.mockRestore();
  });
});
