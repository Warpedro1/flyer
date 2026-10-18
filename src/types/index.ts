/** Mirrors FlyerBack `app/models/schemas.py` — JSON wire format. */

export const EMBEDDING_DIMENSIONS = 1536 as const;

export type ChatSender = 'user' | 'assistant';

export type MediaType = 'image' | 'video';

export type FollowStatus = 'pending' | 'accepted';

export interface UserRead {
  id: string;
  name: string | null;
  email: string | null;
  plan_id: string | null;
  social_mode_enabled: boolean;
  is_private: boolean;
  last_lat: number | null;
  last_long: number | null;
  updated_at: string | null;
}

export interface UserUpdate {
  name?: string | null;
  social_mode_enabled?: boolean | null;
}

export interface EventMediaRead {
  id: string;
  media_url: string;
  type: MediaType;
  order_index: number;
}

/** Taxonomia de coisas para fazer (`EventCategory` no backend). Rótulos: utils/categories.ts. */
export type EventCategory =
  | 'comida_bebida'
  | 'vida_noturna'
  | 'musica_show'
  | 'arte_cultura'
  | 'teatro_cinema'
  | 'palestra_conhecimento'
  | 'cursos_oficinas'
  | 'estudo_leitura'
  | 'debate_comunidade'
  | 'voluntariado'
  | 'desporto'
  | 'academia_exercicio'
  | 'bem_estar'
  | 'praia_natureza'
  | 'turismo_passeio'
  | 'jogos'
  | 'compras_lojas'
  | 'feira_mercado'
  | 'familia_criancas'
  | 'religiao_espiritualidade'
  | 'tecnologia_negocios'
  | 'outros';

/** `event` tem data (ou foi criado na app); `place` é um sítio permanente para ir. */
export type EventKind = 'event' | 'place';

export interface OpeningHours {
  day: string;
  hours: string;
}

/** Se o check-in é possível agora (backend: services/checkin_window.py). */
export type CheckinStatus = 'open' | 'not_yet' | 'closed' | 'no_schedule';

/** Decisões 2026-10-17: eventos do app pelo QR na entrada, lugares por GPS, importados só informativos. */
export type CheckinMethod = 'qr' | 'gps' | 'none';

export interface EventRead {
  id: string;
  kind: EventKind;
  /** Lugar (kind = place) onde o evento acontece. */
  place_id: string | null;
  creator_id: string | null;
  title: string;
  description: string | null;
  /** Um slug de EventCategory; eventos antigos podem ter outro texto. */
  category: string | null;
  location_name: string | null;
  lat: number;
  long: number;
  event_date: string | null;
  /** Fim do evento: o check-in fecha a esta hora. */
  ends_at: string | null;
  /** Janela de check-in (eventos) ou turno de funcionamento atual (lugares). */
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  checkin_status: CheckinStatus | null;
  /** Como se faz check-in: `qr` na entrada (eventos do app), `gps` (lugares), `none` (importados). */
  checkin_method: CheckinMethod;
  /** Pydantic `Decimal` serializes as string in JSON. */
  price: string | null;
  /** Pydantic `Decimal` serializes as string in JSON. */
  rating: string | null;
  attendee_count: number;
  /** null = evento sem limite de pessoas. */
  capacity: number | null;
  waitlist_enabled: boolean;
  call_ttl_minutes: number;
  /** Só vem preenchido em GET /events/:id, não na descoberta. */
  capacity_state: EventCapacityRead | null;
  /** A sua inscrição, só em "Meus eventos" (GET /events/mine, Warpedro1/flyer-back#40). */
  my_rsvp: MyRsvpRead | null;
  is_boosted: boolean;
  boost_expires_at: string | null;
  created_at: string | null;
  media: EventMediaRead[];
  /** Só lugares: horários e nível de preço de 1 ($) a 4 ($$$$). */
  opening_hours: OpeningHours[] | null;
  price_level: number | null;
  /** Itens importados: página na fonte (Google Maps, Sympla) e imagem pública. */
  source_url: string | null;
  cover_url: string | null;
}

export interface DiscoverRequest {
  latitude: number;
  longitude: number;
  radius_km?: number;
  page?: number;
  page_size?: number;
  /** Filtros opcionais. Os lugares passam sempre nos filtros de data e de valor. */
  kinds?: EventKind[];
  categories?: EventCategory[];
  /** ISO 8601. */
  date_from?: string;
  date_to?: string;
  /** Decimal em string; "0" = só grátis. */
  max_price?: string;
}

/**
 * Header `X-Discovery-Mode` de POST /events/discover. `nearby`: o utilizador ainda
 * não tem vetor de interesses e recebe os eventos próximos, por data.
 */
export type DiscoveryMode = 'personalized' | 'nearby';

export interface DiscoverResult {
  events: EventRead[];
  mode: DiscoveryMode;
}

export interface ChatMessageIn {
  content: string;
}

export interface ChatMessageOut {
  role: ChatSender;
  content: string;
  created_at: string | null;
}

export interface CheckInRequest {
  event_id: string;
  lat: number;
  long: number;
}

export interface TrophyRead {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  acquired_at: string | null;
  /** O evento (ou lugar) de onde veio o troféu; o perfil liga até ele. */
  event_id: string | null;
}

export interface FollowRequest {
  target_user_id: string;
}

export interface FollowRead {
  follower_id: string;
  following_id: string;
  status: FollowStatus;
  created_at: string | null;
}

/** O que uma pessoa vê de outra. Nunca o e-mail (#30); o @usuário vem com a #32. */
export interface ProfileBrief {
  id: string;
  name: string | null;
}

export interface FollowAction {
  action: 'accept' | 'reject';
}

export interface PendingFollowOut {
  follower_id: string;
  following_id: string;
  status: FollowStatus;
  created_at: string | null;
  follower: ProfileBrief;
}

export interface PrivacyUpdate {
  is_private: boolean;
}

export interface EmbeddingVector {
  vector: number[];
}

export interface ChatSyncResponse {
  status: string;
  message?: string;
}

export type CompleteOnboardingAnswerKey =
  | 'free_time'
  | 'ideal_weekend'
  | 'hobby_to_start'
  | 'favorite_media'
  | 'one_food_forever'
  | 'sleep_preference';

export type CompleteOnboardingAnswers = Record<CompleteOnboardingAnswerKey, string>;

export interface CompleteOnboardingResponse {
  ok: boolean;
  steps_indexed: number;
  vectorstore_skipped: boolean;
}

export interface FollowCreatedResponse {
  status: string;
}

export interface OkResponse {
  status: string;
}

export interface PlanRead {
  id: string;
  name: string;
  /** Pydantic `Decimal` serializes as string in JSON. */
  price: string | null;
  interval: string | null;
  features: string[];
  is_active: boolean;
}

export interface EventMediaCreate {
  media_url: string;
  type: MediaType;
  order_index?: number;
}

export type RecurrenceMode = 'count' | 'weekly' | 'range';

export interface EventRecurrence {
  mode: RecurrenceMode;
  /** count mode */
  every?: 'day' | 'week' | null;
  occurrences?: number | null;
  /** weekly mode (0 = Monday … 6 = Sunday) */
  weekdays?: number[] | null;
  time_of_day?: string | null;
  until?: string | null;
  /** range mode */
  start?: string | null;
  end?: string | null;
}

/** Troféu personalizado do evento. Campos vazios ficam com o padrão do backend. */
export interface TrophyCustomization {
  /** Por omissão: "Presença: <título>". */
  name?: string | null;
  description?: string | null;
  /** Caminho de uma imagem no bucket event-media ({user_id}/…). Null = ícone do Flyer. */
  icon_url?: string | null;
}

/** Campos que o criador define, ao criar e ao editar (espelha `_EventFields`). */
export interface EventFields {
  title: string;
  description?: string | null;
  category?: EventCategory | null;
  /** Lugar (kind = place) onde o evento acontece. */
  place_id?: string | null;
  location_name?: string | null;
  lat: number;
  long: number;
  /** Início e fim, obrigatórios. Sem fuso = hora de Recife ("2026-10-16T20:00"). */
  event_date: string;
  ends_at: string;
  /** Quando o check-in abre; null = no início. */
  checkin_opens_at?: string | null;
  /** Decimal sent as string. */
  price?: string | null;
  media?: EventMediaCreate[];
  /** null = sem limite de pessoas (predefinição). */
  capacity?: number | null;
  waitlist_enabled?: boolean;
  call_ttl_minutes?: number;
  auto_call_next?: boolean;
  /** Troféu do check-in; sem ele o backend dá o troféu padrão. */
  trophy?: TrophyCustomization | null;
}

export interface EventCreate extends EventFields {
  recurrence?: EventRecurrence | null;
}

/** Editar uma data do evento: tudo menos a recorrência. */
export type EventUpdate = EventFields;

export interface EventMediaEdit {
  /** Caminho no bucket (o que se volta a enviar ao gravar). */
  media_url: string;
  type: MediaType;
  order_index: number;
  preview_url: string | null;
}

export interface TrophyEditRead {
  name: string;
  description: string | null;
  icon_url: string | null;
  icon_preview_url: string | null;
}

/** GET /events/:id/edit (só o criador). Datas em UTC. */
export interface EventEditRead {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  place_id: string | null;
  location_name: string | null;
  lat: number;
  long: number;
  event_date: string | null;
  ends_at: string | null;
  checkin_opens_at: string | null;
  price: string | null;
  capacity: number | null;
  waitlist_enabled: boolean;
  call_ttl_minutes: number;
  auto_call_next: boolean;
  media: EventMediaEdit[];
  trophy: TrophyEditRead | null;
}

/** Espelha o enum Postgres `rsvp_status`. */
/** A sua inscrição num evento de "Meus eventos" (espelha `MyRsvpRead`). */
export interface MyRsvpRead {
  status: RsvpStatus;
  waitlist_position: number | null;
}

/** "Meus eventos": o que você criou, aquilo em que vai, ou os dois. */
export type MyEventsRole = 'created' | 'going' | 'all';
/** Corte no fim do evento. */
export type MyEventsWhen = 'upcoming' | 'past';

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
  /** Quantos continuam à frente na fila; só vem preenchido em `waitlisted`. */
  ahead_count: number | null;
  called_at: string | null;
  call_expires_at: string | null;
  admitted_at: string | null;
  created_at: string | null;
}

export interface RsvpWithProfile extends RsvpRead {
  profile: ProfileBrief;
}

export interface EventCapacityRead {
  /** null = evento sem limite de pessoas. */
  capacity: number | null;
  taken: number;
  waitlist_count: number;
  my_status: RsvpStatus | null;
  my_waitlist_position: number | null;
}

export interface AttendeeListRead {
  capacity: number | null;
  taken: number;
  confirmed: RsvpWithProfile[];
  called: RsvpWithProfile[];
  waitlist: RsvpWithProfile[];
  no_show: RsvpWithProfile[];
}

export interface RsvpQrToken {
  token: string;
  expires_at: string;
}

/** Onde o celular de quem tem o ingresso está, enviado a cada QR novo. */
export interface RsvpQrRequest {
  lat?: number | null;
  long?: number | null;
  /** Precisão informada pelo GPS, em metros. */
  accuracy?: number | null;
  /** Quando o celular fez a leitura (ISO 8601). */
  fix_at?: string | null;
}

/** A entrada aceita, que já é o check-in (decisões 2026-10-17). */
export interface ScanResult {
  ok: boolean;
  status: RsvpStatus;
  attendee: ProfileBrief;
  /** O troféu do evento; null quando não deu para entregar (a entrada vale). */
  trophy: TrophyRead | null;
  /** false quando o organizador confirmou sem localização ou o evento não tem coordenadas. */
  location_checked: boolean;
}

/** GET /realtime/config: chave pública do Pusher; desligado = consultar de tempos em tempos. */
export interface RealtimeConfig {
  enabled: boolean;
  key: string | null;
  cluster: string | null;
}

/** Evento `checkin:done` no canal da pessoa. */
export interface CheckinDoneNotice {
  event_id: string;
  trophy: TrophyRead | null;
}
