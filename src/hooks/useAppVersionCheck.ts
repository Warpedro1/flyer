import { useEffect } from 'react';

const BUNDLE = /<script[^>]+src="(\/assets\/index-[^"]+\.js)"/;

// Fora do componente: uma função nova a cada render voltava a registar o listener.
const reloadPage = () => window.location.reload();

function loadedBundle(): string | null {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return script ? new URL(script.src, window.location.origin).pathname : null;
}

/**
 * Uma SPA aberta numa aba (sobretudo no telemóvel) continua com o bundle antigo depois
 * de um deploy. Quando a app volta ao ecrã, compara o bundle do index.html publicado
 * com o carregado e recarrega se mudou. Em desenvolvimento não há bundle e não faz nada.
 */
export function useAppVersionCheck(reload: () => void = reloadPage): void {
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      const current = loadedBundle();
      if (!current) return;
      try {
        const html = await (await fetch('/index.html', { cache: 'no-store' })).text();
        const published = BUNDLE.exec(html)?.[1];
        if (published && published !== current) reload();
      } catch {
        // Sem rede: fica com a versão que tem.
      }
    };
    const onVisibility = () => void check();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reload]);
}
