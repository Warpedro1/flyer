import { describe, expect, it } from 'vitest';

import appCss from './App.css?raw';

// Só o <main> faz scroll (CLAUDE.md). Se a própria página também fizer, no telemóvel
// o fim do scroll do <main> passa para a página e a barra de navegação mexe-se.
describe('App.css', () => {
  it('a página não faz scroll: html, body e #root têm a altura do ecrã e cortam o excesso', () => {
    const rule = appCss.match(/html,\s*body,\s*#root\s*\{([^}]*)\}/);

    expect(rule).not.toBeNull();
    const body = rule?.[1] ?? '';
    expect(body).toMatch(/height:\s*100%/);
    expect(body).toMatch(/overflow:\s*hidden/);
    expect(body).toMatch(/overscroll-behavior:\s*none/);
  });

  it('não usa 100vh, que no telemóvel é mais alto do que o ecrã visível', () => {
    expect(appCss).not.toMatch(/100vh/);
  });
});
