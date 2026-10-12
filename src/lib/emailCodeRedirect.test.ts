import { describe, expect, it, vi } from 'vitest';

import { redirectIfEmailCodeRequired } from './emailCodeRedirect.ts';

function error(status: number, detail: unknown) {
  return { response: { status, data: { detail } } };
}

describe('redirectIfEmailCodeRequired', () => {
  it('um 403 email_code_required leva ao ecrã do código', () => {
    const go = vi.fn();

    expect(redirectIfEmailCodeRequired(error(403, 'email_code_required'), '/events', go)).toBe(true);
    expect(go).toHaveBeenCalledWith('/login/code');
  });

  it('não sai do próprio ecrã do código', () => {
    const go = vi.fn();

    redirectIfEmailCodeRequired(error(403, 'email_code_required'), '/login/code', go);

    expect(go).not.toHaveBeenCalled();
  });

  it('outros erros não mudam de ecrã (nem o 401: a sessão do Supabase continua)', () => {
    const go = vi.fn();

    expect(redirectIfEmailCodeRequired(error(403, 'Sem permissão para este recurso.'), '/', go)).toBe(false);
    expect(redirectIfEmailCodeRequired(error(401, 'email_code_required'), '/', go)).toBe(false);
    expect(redirectIfEmailCodeRequired(new Error('rede'), '/', go)).toBe(false);
    expect(go).not.toHaveBeenCalled();
  });
});

describe('profile_incomplete', () => {
  it('um 403 profile_incomplete leva a completar o cadastro', () => {
    const go = vi.fn();

    expect(redirectIfEmailCodeRequired(error(403, 'profile_incomplete'), '/events', go)).toBe(true);
    expect(go).toHaveBeenCalledWith('/complete-profile');
  });

  it('não sai do próprio ecrã de completar', () => {
    const go = vi.fn();

    redirectIfEmailCodeRequired(error(403, 'profile_incomplete'), '/complete-profile', go);

    expect(go).not.toHaveBeenCalled();
  });
});
