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

export interface ProfileBrief {
  id: string;
  name: string | null;
  email: string | null;
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

export interface EventCreate {
  title: string;
  description?: string | null;
  category?: EventCategory | null;
  /** Lugar (kind = place) onde o evento acontece. */
  place_id?: string | null;
  location_name?: string | null;
  lat: number;
  long: number;
  event_date?: string | null;
  /** Decimal sent as string. */
  price?: string | null;
  media?: EventMediaCreate[];
  recurrence?: EventRecurrence | null;
  /** null = sem limite de pessoas (predefinição). */
  capacity?: number | null;
  waitlist_enabled?: boolean;
  call_ttl_minutes?: number;
  auto_call_next?: boolean;
}

/** Espelha o enum Postgres `rsvp_status`. */
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

export interface ScanResult {
  ok: boolean;
  status: RsvpStatus;
  attendee: ProfileBrief;
}
