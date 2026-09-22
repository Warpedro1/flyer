import { describe, expect, it } from 'vitest';

import { isImmersivePath } from './immersivePaths.ts';
describe('isImmersivePath', () => {
  it('trata o detalhe, o bilhete e o leitor como ecrãs de ecrã-inteiro', () => {
    expect(isImmersivePath('/events/abc')).toBe(true);
    expect(isImmersivePath('/events/abc/ticket')).toBe(true);
    expect(isImmersivePath('/events/abc/scan')).toBe(true);
    expect(isImmersivePath('/plans')).toBe(true);
    expect(isImmersivePath('/events/new')).toBe(true);
  });

  it('mantém a gestão de participantes dentro do layout normal', () => {
    // A lista tem navegação e polling; não é um ecrã imersivo.
    expect(isImmersivePath('/events/abc/attendees')).toBe(false);
  });

  it('não apanha outras rotas', () => {
    expect(isImmersivePath('/')).toBe(false);
    expect(isImmersivePath('/events')).toBe(false);
    expect(isImmersivePath('/chat')).toBe(false);
  });
});
