
/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true, // Permite usar describe/it/expect sem ter de importar em cada ficheiro
    environment: 'jsdom', // Usa o JSDOM para simular o browser
    setupFiles: './src/setupTests.ts', // Ficheiro que corre antes de todos os testes
  },
});
