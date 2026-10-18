import { describe, expect, it, vi } from 'vitest';

import { redirectIfEmailCodeRequired, redirectIfNotAuthenticated } from './emailCodeRedirect.ts';

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

describe('signup_pending', () => {
  it('um 403 signup_pending leva ao código do cadastro', () => {
    const go = vi.fn();

    expect(redirectIfEmailCodeRequired(error(403, 'signup_pending'), '/events', go)).toBe(true);
    expect(go).toHaveBeenCalledWith('/signup/code');
  });
});

describe('not_authenticated (Warpedro1/flyer-back#42)', () => {
  function unauthenticated() {
    return {
      response: { status: 401, data: { detail: 'Entre na sua conta para continuar.', code: 'not_authenticated' } },
    };
  }

  it('um pedido sem sessão leva ao login', () => {
    const go = vi.fn();

    expect(redirectIfNotAuthenticated(unauthenticated(), '/events', go)).toBe(true);
    expect(go).toHaveBeenCalledWith('/login');
  });

  it('não sai das telas de entrada', () => {
    const go = vi.fn();

    for (const path of ['/login', '/login/code', '/signup', '/signup/code', '/forgot-password', '/reset-password']) {
      redirectIfNotAuthenticated(unauthenticated(), path, go);
    }

    expect(go).not.toHaveBeenCalled();
  });

  it('outros 401 (token recusado pelo backend) não mudam de tela', () => {
    const go = vi.fn();

    expect(
      redirectIfNotAuthenticated({ response: { status: 401, data: { detail: 'Token inválido.' } } }, '/', go),
    ).toBe(false);
    expect(redirectIfNotAuthenticated(new Error('rede'), '/', go)).toBe(false);
    expect(go).not.toHaveBeenCalled();
  });
});
