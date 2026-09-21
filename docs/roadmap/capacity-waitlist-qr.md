# Próximo passo — Lotação, lista de espera e check-in por QR (frontend)

> Estado: **especificação**, ainda não implementado.
> Os contratos da API estão em `FlyerBack/docs/roadmap/capacity-waitlist-qr.md`.
> Implementar **depois** do backend: sem os endpoints não há o que testar contra
> MSW a não ser contratos inventados.

## O que o utilizador vai poder fazer

- **Participante** — ver quantas vagas restam, carregar em "Vou" e ficar
  `confirmed`, ou entrar na **lista de espera** e ver a sua posição. Quando é
  chamado, abre o bilhete e mostra um **QR code** na porta. O bilhete mostra um
  contador regressivo do prazo que tem para aparecer.
- **Criador** — ver confirmados e fila, carregar em **"Chamar o próximo"**, e ler
  o QR com a câmara para admitir a pessoa.

Dois comportamentos que a UI tem de deixar óbvios:

1. **Evento sem limite de pessoas** (`capacity === null`) — é o caso por omissão.
   Não mostrar barra de lotação nem lista de espera nenhuma; o botão é só "Vou".
2. **A chamada expira e a fila anda.** Quem é chamado vê um contador; quando
   chega a zero o estado passa a `no_show` e o próximo é chamado sozinho. O ecrã
   do criador faz polling de 15 s e é isso que faz a varredura do backend correr,
   por isso o polling **não é cosmético** — não o remover.

## Ordem de trabalho (TDD, como manda o `CLAUDE.md`)

O `.cursor/rules/frontend.mdc` exige escrever o `*.test.tsx` **antes** de mexer no
componente. Para cada item abaixo: handler MSW primeiro, teste a seguir,
componente depois.

1. `src/types/index.ts` — espelhar os schemas novos.
2. `src/services/flyerApi.ts` — as funções novas.
3. `src/mocks/handlers.ts` — hoje está vazio (`handlers: HttpHandler[] = []`);
   passa a ter as rotas de RSVP, porque nenhum destes ecrãs pode ser testado sem
   interceção (chamadas reais são proibidas).
4. `CreateEventPage` — campos de lotação.
5. `EventDetailsPage` — estado da lotação + botão de RSVP.
6. `MyTicketPage` (novo) — o QR rotativo.
7. `EventAttendeesPage` (novo) — a fila e o "chamar o próximo".
8. `ScanTicketPage` (novo) — a câmara.

## Tipos (`src/types/index.ts`)

Espelho exato do Pydantic. `Decimal` continua a ser `string | null`.

```ts
export type RsvpStatus =
  | 'confirmed'
  | 'waitlisted'
  | 'called'
  | 'admitted'
  | 'no_show'
  | 'cancelled';

export interface RsvpRead {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  waitlist_position: number | null;
  ahead_count: number | null;
  called_at: string | null;
  call_expires_at: string | null;
  admitted_at: string | null;
  created_at: string | null;
}

export interface EventCapacityRead {
  /** null = evento sem limite de pessoas. */
  capacity: number | null;
  taken: number;
  waitlist_count: number;
  my_status: RsvpStatus | null;
  my_waitlist_position: number | null;
}

export interface RsvpQrToken {
  token: string;
  expires_at: string;
}

export interface AttendeeListRead {
  capacity: number | null;
  taken: number;
  confirmed: RsvpWithProfile[];
  called: RsvpWithProfile[];
  waitlist: RsvpWithProfile[];
}

export interface RsvpWithProfile extends RsvpRead {
  profile: ProfileBrief;
}

export interface ScanResult {
  ok: boolean;
  status: RsvpStatus;
  attendee: ProfileBrief;
}
```

`EventRead` ganha `capacity: number | null`, `call_ttl_minutes: number` e
`capacity_state: EventCapacityRead | null`. `EventCreate` ganha `capacity`,
`waitlist_enabled`, `call_ttl_minutes` e `auto_call_next`.

## Serviço (`src/services/flyerApi.ts`)

```ts
export async function joinEvent(eventId: string): Promise<RsvpRead>;
export async function leaveEvent(eventId: string): Promise<void>;
export async function getMyRsvp(eventId: string): Promise<RsvpRead | null>;
export async function getRsvpQrToken(eventId: string): Promise<RsvpQrToken>;
export async function getEventAttendees(eventId: string): Promise<AttendeeListRead>;
export async function callNextInWaitlist(eventId: string): Promise<RsvpRead | null>;
export async function recallAttendee(eventId: string, rsvpId: string): Promise<RsvpRead>;
export async function scanTicket(eventId: string, token: string): Promise<ScanResult>;
```

Mesmo padrão do resto do ficheiro: `apiClient`, `encodeURIComponent` nos ids,
devolver `data`. `getMyRsvp` trata `404` como `null` — não inscrito não é erro.

## Rotas novas (`src/App.tsx`)

```tsx
<Route path="/events/:id/ticket"    element={<MyTicketPage />} />
<Route path="/events/:id/attendees" element={<EventAttendeesPage />} />
<Route path="/events/:id/scan"      element={<ScanTicketPage />} />
```

`isImmersivePath` em `AppLayout.tsx` já apanha `/events/:id` com
`/^\/events\/([^/]+)$/`, que **não** casa com estas rotas de dois segmentos.
`/ticket` e `/scan` são ecrãs de ecrã-inteiro, por isso a regex tem de crescer
para `/^\/events\/([^/]+)(\/(ticket|scan))?$/` — com o cuidado de manter o
`m[1] !== 'new'` para `/events/new` continuar fora. `/attendees` fica com o
layout normal.

## Ecrãs

### `CreateEventPage` (existente, 615 linhas)

Um bloco "Lotação" a seguir ao preço:

- Toggle **"Limitar número de pessoas"** — desligado por omissão, e desligado
  envia `capacity: null` (evento sem limite). Não enviar `0`.
- Ligado: campo numérico `capacity` (`min=1`), toggle "Lista de espera quando
  encher" (`waitlist_enabled`, ligado), campo "Minutos para a pessoa chamada
  aparecer" (`call_ttl_minutes`, 10) e toggle "Chamar o próximo automaticamente
  quando o prazo passar" (`auto_call_next`, ligado).
- Os campos de prazo só aparecem com a lista de espera ligada — sem fila não há
  quem chamar.

### `EventDetailsPage` (existente)

Entre a meta do evento e o botão de check-in, usando `event.capacity_state`:

- `capacity === null` → sem barra, sem contagem. Só o botão **"Vou"**.
- Com lotação → barra `taken / capacity` e texto `"12 de 50 vagas"`.
- Cheio e `my_status === null` → **"Entrar na lista de espera"**.
- `my_status === 'waitlisted'` → `"És o 3.º da lista"` + botão "Sair da lista".
- `my_status === 'confirmed'` → **"Ver o meu bilhete"** → `/events/:id/ticket`.
- `my_status === 'called'` → destaque `red-600` **"É a tua vez!"** + contador até
  `call_expires_at` + botão para o bilhete.
- `my_status === 'no_show'` → `"A tua chamada expirou"` + "Entrar na fila outra vez".
- `creator_id === user.id` → link **"Gerir participantes"** → `/events/:id/attendees`.

O check-in por GPS que já existe e o check-in por QR **coexistem**: o GPS dá o
troféu (`/trophies/checkin`), o QR dá a entrada (`/attendance/scan`). São coisas
diferentes e não se substituem.

### `MyTicketPage` (novo)

O QR que o participante mostra à porta.

- Chama `getRsvpQrToken` no `mount` e **renova a cada 30 s** (o token vive 45 s).
- `useEffect` com `clearInterval` no cleanup — obrigatório pelas regras do repo, e
  aqui é mesmo um bug real se faltar: o intervalo continuava a bater na API depois
  de sair do ecrã.
- Contador regressivo até `call_expires_at` quando o estado é `called`. Ao chegar
  a zero, refrescar o RSVP em vez de assumir `no_show` — quem decide é o backend.
- Estado `admitted` → ecrã verde "Entraste", sem QR.
- Manter o ecrã acordado com a Screen Wake Lock API quando existir
  (`'wakeLock' in navigator`), libertando no cleanup. Sem ela, não fazer nada.

### `EventAttendeesPage` (novo, só criador)

- Cabeçalho com `taken / capacity` (ou "Sem limite").
- Secção **"Chamado agora"** com o contador de cada `called`.
- Secção **"Na fila"** por ordem, com o botão **"Chamar o próximo"** em destaque.
- Secção "Confirmados" e "Não apareceram" (com botão "Rechamar").
- Polling de 15 s com `setInterval` + `clearInterval` no cleanup. É o que faz a
  varredura do backend correr — ver a nota no topo.
- Botão **"Ler QR"** → `/events/:id/scan`.

### `ScanTicketPage` (novo, só criador)

- Preferir a **`BarcodeDetector` nativa** (Chrome/Android) com
  `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`.
- Fallback para `@zxing/browser` quando `'BarcodeDetector' in window` é falso
  (Safari/iOS). É uma lib de descodificação, não uma biblioteca de componentes —
  não colide com a regra de "só Tailwind, sem MUI/Bootstrap".
- Fallback final: campo de texto para colar o token à mão.
- **Parar a stream da câmara no cleanup** (`stream.getTracks().forEach(t => t.stop())`).
  Sem isto a luz da câmara fica acesa depois de sair do ecrã.
- Depois de ler: `scanTicket(eventId, token)` e mostrar nome + resultado, com o
  `detail` do backend em claro quando dá erro (QR expirado, já usado, ainda na
  fila, chamada expirada — a lista está na spec do backend).
- Voltar ao modo de leitura ao fim de 3 s, para dar para ler uma fila seguida.

## Dependências novas

| Pacote | Para quê | Porquê este |
| --- | --- | --- |
| `qrcode` (+ `@types/qrcode`) | desenhar o QR em `<canvas>` | sem dependências, ~20 kB, sem UI própria |
| `@zxing/browser` | ler QR onde não há `BarcodeDetector` | único fallback sério para iOS |

Nenhuma das duas traz componentes prontos — a regra "só Tailwind v4, sem
bibliotecas de componentes" mantém-se intacta.

## Testes (Vitest + Testing Library + MSW)

- `EventDetailsPage.test.tsx` — **`capacity: null` não mostra barra nem fila**;
  cheio mostra "Entrar na lista de espera"; `waitlisted` mostra a posição;
  `called` mostra "É a tua vez!"; o link de gerir só aparece ao criador.
- `MyTicketPage.test.tsx` — pede token novo ao fim de 30 s (`vi.useFakeTimers`);
  o intervalo **para** quando o componente é desmontado; `admitted` não desenha QR.
- `EventAttendeesPage.test.tsx` — "Chamar o próximo" faz o POST e atualiza a
  lista; o polling para no unmount; fila vazia desativa o botão.
- `ScanTicketPage.test.tsx` — token válido mostra o nome; token expirado mostra a
  mensagem do backend; a stream da câmara é parada no unmount (mockar
  `navigator.mediaDevices`).

Todas com handlers em `src/mocks/handlers.ts`. Sem chamadas reais, sem `any`,
testar comportamento e não estado interno.
