import { describe, expect, it } from 'vitest';

import indexHtml from '../index.html?raw';

// O index.html é carregado em cada visita, antes da app arrancar. Num telemóvel com
// rede fraca, cada recurso externo atrasa a primeira renderização, e um script de CDN
// sem `integrity` corre código de terceiros na app.
describe('index.html', () => {
  it('não carrega scripts nem folhas de estilo de CDNs externos', () => {
    const externalTags = indexHtml.match(/<(script|link)\b[^>]*\b(src|href)=["']https?:\/\/[^"']+["'][^>]*>/gi);

    expect(externalTags).toBeNull();
  });

  it('não carrega o Bootstrap (o CLAUDE.md só permite Tailwind)', () => {
    expect(indexHtml.toLowerCase()).not.toContain('bootstrap');
  });

  it('declara a língua da app como português', () => {
    expect(indexHtml).toMatch(/<html[^>]*\blang="pt"/);
  });

  it('deixa a app ocupar o ecrã todo no iPhone, para a barra de baixo respeitar a zona segura', () => {
    // Sem viewport-fit=cover, env(safe-area-inset-bottom) vale 0 no iOS e a barra
    // de navegação fica por baixo do indicador de início.
    expect(indexHtml).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover/);
  });
});
