# Flyer — frontend

Frontend do Flyer: React 18 + TypeScript + Vite, Tailwind CSS v4.
Precisa do backend (`FlyerBack`) a correr para funcionar.

## Rodar localmente

O Flyer são **dois processos**. Arranca o backend primeiro.

**Terminal 1 — backend (`FlyerBack/`):**

```bash
.venv/bin/uvicorn app.main:app --reload   # Windows: .venv\Scripts\uvicorn app.main:app --reload
```

**Terminal 2 — frontend (este repositório):**

```bash
cp .env.example .env    # e preencher
npm install
npm run dev
```

A app fica em **http://localhost:5173** (o Vite abre o browser sozinho).

### Variáveis de ambiente

| Variável | Para quê |
| --- | --- |
| `VITE_SUPABASE_URL` | projeto Supabase (autenticação) |
| `VITE_SUPABASE_ANON_KEY` | chave publicável do Supabase — **nunca** a `service_role` |
| `VITE_API_BASE_URL` | URL do backend, normalmente `http://127.0.0.1:8000` |

`lib/apiClient.ts` e `lib/supabase.ts` rebentam no arranque se faltar alguma —
o erro no ecrã branco é esse, não um bug de build.

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento na porta 5173 |
| `npm run build` | `tsc -b` + build de produção para `dist/` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (jsdom) |
| `npm run test:ui` | Vitest com interface |

### Se a app abre mas nada carrega

Os pedidos vão todos para o backend. `curl http://127.0.0.1:8000/health` deve
devolver `{"status":"ok",...}`; se não devolver, o problema é o backend, não este
projeto.

---

# Notas do template Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
