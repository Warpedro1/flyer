import { describe, expect, it } from 'vitest';

import { apiResponseError, networkError } from '../test/axiosErrors.ts';

import { formatApiError, getApiErrorInfo, isNotFoundError } from './apiError.ts';

describe('getApiErrorInfo', () => {
  it('lê a mensagem, o código e a referência do corpo', () => {
    const err = apiResponseError(401, {
      detail: 'Sessão inválida: entra outra vez.',
      code: 'session_invalid',
      request_id: 'abc123def456',
    });

    expect(getApiErrorInfo(err)).toEqual({
      status: 401,
      code: 'session_invalid',
      requestId: 'abc123def456',
      message: 'Sessão inválida: entra outra vez.',
    });
  });

  it('lê o código de um detail em objeto (onboarding) e a referência do cabeçalho', () => {
    const err = apiResponseError(
      503,
      { detail: { code: 'moderation_unavailable', reason_codes: [] } },
      { 'x-request-id': 'ref-0000aaaa' },
    );

    const info = getApiErrorInfo(err);

    expect(info.code).toBe('moderation_unavailable');
    expect(info.requestId).toBe('ref-0000aaaa');
  });
});

describe('formatApiError', () => {
  it('mostra o detail em texto tal como vem', () => {
    expect(formatApiError(apiResponseError(409, { detail: 'Este CPF já tem uma conta.' }))).toBe(
      'Este CPF já tem uma conta.',
    );
  });

  it('um erro nosso (5xx) diz o código e a referência', () => {
    const err = apiResponseError(500, {
      detail: 'Erro interno. Tenta de novo daqui a pouco.',
      code: 'internal_error',
      request_id: 'abc123def456',
    });

    expect(formatApiError(err)).toBe(
      'Erro interno. Tenta de novo daqui a pouco. (código: internal_error · ref abc123def456)',
    );
  });

  it('um 5xx sem detail em texto usa a frase genérica com o código', () => {
    const err = apiResponseError(503, { detail: { code: 'moderation_unavailable' } }, { 'x-request-id': 'r1234567' });

    expect(formatApiError(err)).toBe(
      'Estamos com um problema do nosso lado. Tenta de novo daqui a pouco. (código: moderation_unavailable · ref r1234567)',
    );
  });

  it('a validação do FastAPI não aparece em JSON cru', () => {
    const err = apiResponseError(422, {
      detail: [{ loc: ['body', 'cpf'], msg: 'CPF inválido.', type: 'value_error' }],
    });

    expect(formatApiError(err)).toBe('Dados inválidos: CPF inválido.');
  });

  it('demasiados pedidos sem detail dá uma frase em português', () => {
    expect(formatApiError(apiResponseError(429, { error: 'Rate limit exceeded: 3 per 10 minute' }))).toBe(
      'Muitos pedidos seguidos. Espera um pouco e tenta de novo.',
    );
  });

  it('sem resposta é falta de ligação', () => {
    expect(formatApiError(networkError())).toBe('Sem ligação ao servidor. Verifica a internet e tenta de novo.');
  });

  it('um erro que não é do axios mostra a sua mensagem', () => {
    expect(formatApiError(new Error('falhou'))).toBe('falhou');
    expect(formatApiError('x')).toBe('Erro desconhecido.');
  });
});

describe('isNotFoundError', () => {
  it('só um 404 da API', () => {
    expect(isNotFoundError(apiResponseError(404, { detail: 'Evento não encontrado.' }))).toBe(true);
    expect(isNotFoundError(apiResponseError(403, { detail: 'x' }))).toBe(false);
    expect(isNotFoundError(new Error('404'))).toBe(false);
  });
});
