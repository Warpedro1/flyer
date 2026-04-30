# Arquitetura do Projeto

## Estrutura (resumo)

```
src/
├── components/
│   ├── layout/     # AppLayout, WingHeartLogo
│   ├── map/        # EventMap (Leaflet)
│   └── ui/         # EventFeedCard, etc.
├── pages/          # Rotas (Discover, Map, Chat, …)
├── contexts/       # AuthProvider
├── hooks/          # useAuth, useGeolocation, useEffectiveGeo
├── services/       # flyerApi (cliente HTTP)
├── types/          # Tipos alinhados ao backend
├── utils/          # Constantes, formatadores, erros
├── styles/         # App.css (Tailwind v4)
├── App.tsx
└── main.tsx
```

- **Layout**: `AppLayout` inclui sidebar (desktop), header e bottom nav (mobile), guard de sessão e rotas imersivas (`/events/new`, `/events/:id`, `/plans`).
- **Estilos**: Tailwind CSS v4 via `@tailwindcss/vite`; Leaflet mantém o seu CSS em `main.tsx`.
