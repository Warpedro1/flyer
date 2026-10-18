import { describe, expect, it } from 'vitest';

import { formatCpfInput, formatPhoneInput, identityProblems, isValidCpf, isValidMobile } from './brDocuments.ts';

describe('CPF', () => {
  it('valida os dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
  });

  it('formata enquanto se escreve', () => {
    expect(formatCpfInput('529')).toBe('529');
    expect(formatCpfInput('5299')).toBe('529.9');
    expect(formatCpfInput('52998224725')).toBe('529.982.247-25');
    expect(formatCpfInput('529.982.247-2599')).toBe('529.982.247-25');
  });
});

describe('celular', () => {
  it('aceita DDD + 9 dígitos começando por 9', () => {
    expect(isValidMobile('(81) 91234-5678')).toBe(true);
    expect(isValidMobile('81912345678')).toBe(true);
    expect(isValidMobile('(81) 3123-4567')).toBe(false);
    expect(isValidMobile('(80) 91234-5678')).toBe(false);
    expect(isValidMobile('91234-5678')).toBe(false);
  });

  it('formata enquanto se escreve', () => {
    expect(formatPhoneInput('8')).toBe('(8');
    expect(formatPhoneInput('819')).toBe('(81) 9');
    expect(formatPhoneInput('81912345678')).toBe('(81) 91234-5678');
    expect(formatPhoneInput('8191234567899')).toBe('(81) 91234-5678');
  });
});

describe('identityProblems (Warpedro1/flyer-back#29)', () => {
  it('o celular é opcional, mas o CPF não', () => {
    expect(identityProblems('529.982.247-25', '')).toEqual([]);
    expect(identityProblems('529.982.247-25', '   ')).toEqual([]);
    expect(identityProblems('', '')).toEqual(['CPF inválido']);
  });

  it('um celular informado continua validado', () => {
    expect(identityProblems('529.982.247-25', '(81) 3123-4567')).toEqual([
      'Celular inválido: DDD + número com 9 dígitos',
    ]);
  });
});
