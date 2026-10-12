import { describe, expect, it } from 'vitest';

import { formatRecifeDayTime, formatRecifeTime, isoToRecifeInput } from './recifeTime.ts';

// O backend guarda e devolve em UTC; os eventos são em Recife (UTC−03:00), seja qual
// for o fuso do telemóvel de quem os vê.
describe('hora de Recife', () => {
  it('converte um ISO em UTC para o valor de um <input type="datetime-local">', () => {
    expect(isoToRecifeInput('2026-10-16T23:00:00+00:00')).toBe('2026-10-16T20:00');
    expect(isoToRecifeInput('2026-10-17T02:30:00Z')).toBe('2026-10-16T23:30');
  });

  it('aceita ISO já com o fuso de Recife', () => {
    expect(isoToRecifeInput('2026-10-16T20:00:00-03:00')).toBe('2026-10-16T20:00');
  });

  it('sem data devolve vazio', () => {
    expect(isoToRecifeInput(null)).toBe('');
    expect(isoToRecifeInput('lixo')).toBe('');
  });

  it('formata a hora e o dia', () => {
    expect(formatRecifeTime('2026-10-16T23:05:00Z')).toBe('20:05');
    expect(formatRecifeDayTime('2026-10-16T23:05:00Z')).toBe('20:05 de 16/10');
  });
});
