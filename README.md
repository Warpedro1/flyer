# Flyer — frontend

**[Live app](https://flyer-inky.vercel.app)** · Frontend (this repo) · [Backend & architecture](https://github.com/Warpedro1/flyer-back)

React 18 + TypeScript + Vite + Tailwind CSS v4 client for Flyer, an event-discovery app with an AI taste agent: chat onboarding, personalized discovery, map, event creation, waitlist and QR ticket check-in. 381 Vitest tests.

> Needs the backend (`flyer-back`) running. Os comandos abaixo estão em português.

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
