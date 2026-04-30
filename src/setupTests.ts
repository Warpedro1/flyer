// src/setupTests.ts
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server.ts';

// Inicia o servidor MSW antes de todos os testes
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Limpa os handlers após cada teste (para que um teste não afete o outro)
afterEach(() => server.resetHandlers());

// Desliga o servidor MSW no final
afterAll(() => server.close());