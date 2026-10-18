import axios from 'axios';

import { apiClient } from '../lib/apiClient.ts';
import { supabase } from '../lib/supabase.ts';
import type {
  AttendeeListRead,
  ChatMessageIn,
  ChatMessageOut,
  ChatSyncResponse,
  CheckInRequest,
  CompleteOnboardingAnswers,
  CompleteOnboardingResponse,
  DiscoverRequest,
  DiscoverResult,
  EventCreate,
  EventEditRead,
  EventUpdate,
  EventRead,
  FollowAction,
  FollowCreatedResponse,
  MyEventsRole,
  MyEventsWhen,
  OkResponse,
  PendingFollowOut,
  PlanRead,
  ProfileBrief,
  RealtimeConfig,
  RsvpQrRequest,
  RsvpQrToken,
  RsvpRead,
  ScanResult,
  TrophyRead,
} from '../types/index.ts';
import { parseDiscoveryMode } from '../utils/discoveryMode.ts';

export async function discoverEventsWithMode(req: DiscoverRequest): Promise<DiscoverResult> {
  const { data, headers } = await apiClient.post<EventRead[]>('/events/discover', req);
  return { events: data, mode: parseDiscoveryMode(headers['x-discovery-mode']) };
}

export async function discoverEvents(req: DiscoverRequest): Promise<EventRead[]> {
  const { events } = await discoverEventsWithMode(req);
  return events;
}

export async function checkIn(req: CheckInRequest): Promise<TrophyRead> {
  const { data } = await apiClient.post<TrophyRead>('/trophies/checkin', req);
  return data;
}

export async function sendChatMessage(req: ChatMessageIn): Promise<ChatMessageOut> {
  const { data } = await apiClient.post<ChatMessageOut>('/chat/message', req);
  return data;
}

export async function getChatHistory(): Promise<ChatMessageOut[]> {
  const { data } = await apiClient.get<ChatMessageOut[]>('/chat/history');
  return data;
}

export async function syncChat(): Promise<ChatSyncResponse> {
  const { data } = await apiClient.post<ChatSyncResponse>('/chat/sync');
  return data;
}

export async function completeOnboarding(body: {
  answers: CompleteOnboardingAnswers;
}): Promise<CompleteOnboardingResponse> {
  const { data } = await apiClient.post<CompleteOnboardingResponse>('/chat/complete-onboarding', body);
  return data;
}

export async function validateOnboarding(body: {
  answers: CompleteOnboardingAnswers;
}): Promise<{ ok: boolean }> {
  const { data } = await apiClient.post<{ ok: boolean }>('/chat/validate-onboarding', body);
  return data;
}

export async function followUser(targetId: string): Promise<FollowCreatedResponse> {
  const { data } = await apiClient.post<FollowCreatedResponse>(
    `/social/follow/${encodeURIComponent(targetId)}`,
  );
  return data;
}

export async function unfollowUser(targetId: string): Promise<void> {
  await apiClient.delete(`/social/following/${encodeURIComponent(targetId)}`);
}

export async function listFollowRequests(): Promise<PendingFollowOut[]> {
  const { data } = await apiClient.get<PendingFollowOut[]>('/social/requests');
  return data;
}

export async function respondToFollowRequest(
  followerId: string,
  body: FollowAction,
): Promise<OkResponse> {
  const { data } = await apiClient.patch<OkResponse>(
    `/social/requests/${encodeURIComponent(followerId)}`,
    body,
  );
  return data;
}

export async function listFollowing(): Promise<ProfileBrief[]> {
  const { data } = await apiClient.get<ProfileBrief[]>('/social/following');
  return data;
}

export async function listFollowers(): Promise<ProfileBrief[]> {
  const { data } = await apiClient.get<ProfileBrief[]>('/social/followers');
  return data;
}

export async function listPlans(): Promise<PlanRead[]> {
  const { data } = await apiClient.get<PlanRead[]>('/plans/');
  return data;
}

export async function createEvent(req: EventCreate): Promise<EventRead> {
  const { data } = await apiClient.post<EventRead>('/events/', req);
  return data;
}

/** Formulário de edição: valores guardados e caminhos das imagens (só o criador). */
export async function getEventForEdit(eventId: string): Promise<EventEditRead> {
  const { data } = await apiClient.get<EventEditRead>(`/events/${encodeURIComponent(eventId)}/edit`);
  return data;
}

export async function updateEvent(eventId: string, req: EventUpdate): Promise<EventRead> {
  const { data } = await apiClient.put<EventRead>(`/events/${encodeURIComponent(eventId)}`, req);
  return data;
}

/** O dono abre o check-in agora (fecha no fim do evento). */
export async function openCheckin(eventId: string): Promise<EventRead> {
  const { data } = await apiClient.post<EventRead>(`/events/${encodeURIComponent(eventId)}/checkin/open`);
  return data;
}

/** O dono fecha o check-in antes do fim. */
export async function closeCheckin(eventId: string): Promise<EventRead> {
  const { data } = await apiClient.post<EventRead>(`/events/${encodeURIComponent(eventId)}/checkin/close`);
  return data;
}

export async function getEventById(eventId: string): Promise<EventRead> {
  const { data } = await apiClient.get<EventRead>(`/events/${encodeURIComponent(eventId)}`);
  return data;
}

/** Próximos eventos que acontecem num lugar (kind = place). */
export async function getPlaceEvents(placeId: string): Promise<EventRead[]> {
  const { data } = await apiClient.get<EventRead[]>(`/events/${encodeURIComponent(placeId)}/events`);
  return data;
}

/** Filtros de "Meus eventos" (Warpedro1/flyer-back#40). Sem nenhum: o que você criou. */
export interface MyEventsQuery {
  role?: MyEventsRole;
  when?: MyEventsWhen;
  limit?: number;
  offset?: number;
}

export async function getMyEvents(query: MyEventsQuery = {}): Promise<EventRead[]> {
  const { data } = await apiClient.get<EventRead[]>('/events/mine', { params: query });
  return data;
}

export async function getUserTrophies(): Promise<TrophyRead[]> {
  const { data } = await apiClient.get<TrophyRead[]>('/trophies/');
  return data;
}

// --- Lotação, lista de espera e admissão por QR ---

export async function joinEvent(eventId: string): Promise<RsvpRead> {
  const { data } = await apiClient.post<RsvpRead>(
    `/events/${encodeURIComponent(eventId)}/rsvp`,
  );
  return data;
}

export async function leaveEvent(eventId: string): Promise<void> {
  await apiClient.delete(`/events/${encodeURIComponent(eventId)}/rsvp`);
}

/** `null` quando o utilizador nunca se inscreveu — não é um erro. */
export async function getMyRsvp(eventId: string): Promise<RsvpRead | null> {
  try {
    const { data } = await apiClient.get<RsvpRead>(
      `/events/${encodeURIComponent(eventId)}/rsvp`,
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

/** A posição vai no corpo, e não na URL, para não ficar nos logs. */
export async function getRsvpQrToken(
  eventId: string,
  position: RsvpQrRequest = {},
): Promise<RsvpQrToken> {
  const { data } = await apiClient.post<RsvpQrToken>(
    `/events/${encodeURIComponent(eventId)}/rsvp/qr`,
    position,
  );
  return data;
}

export async function getEventAttendees(eventId: string): Promise<AttendeeListRead> {
  const { data } = await apiClient.get<AttendeeListRead>(
    `/events/${encodeURIComponent(eventId)}/attendees`,
  );
  return data;
}

/** `null` quando a fila está vazia (o backend responde 204). */
export async function callNextInWaitlist(eventId: string): Promise<RsvpRead | null> {
  const { data, status } = await apiClient.post<RsvpRead | ''>(
    `/events/${encodeURIComponent(eventId)}/waitlist/call-next`,
  );
  if (status === 204 || !data) return null;
  return data as RsvpRead;
}

export async function recallAttendee(
  eventId: string,
  rsvpId: string,
): Promise<RsvpRead> {
  const { data } = await apiClient.post<RsvpRead>(
    `/events/${encodeURIComponent(eventId)}/waitlist/${encodeURIComponent(rsvpId)}/recall`,
  );
  return data;
}

/** Pula a vez de quem foi chamado e não vai aparecer (Warpedro1/flyer-back#5): vira `no_show`. */
export async function skipAttendee(eventId: string, rsvpId: string): Promise<RsvpRead> {
  const { data } = await apiClient.post<RsvpRead>(
    `/events/${encodeURIComponent(eventId)}/waitlist/${encodeURIComponent(rsvpId)}/skip`,
  );
  return data;
}

export async function scanTicket(
  eventId: string,
  token: string,
  options: { confirmWithoutLocation?: boolean } = {},
): Promise<ScanResult> {
  const { data } = await apiClient.post<ScanResult>(
    `/events/${encodeURIComponent(eventId)}/attendance/scan`,
    options.confirmWithoutLocation ? { token, confirm_without_location: true } : { token },
  );
  return data;
}

// --- Tempo real (Pusher) ---

export async function getRealtimeConfig(): Promise<RealtimeConfig> {
  const { data } = await apiClient.get<RealtimeConfig>('/realtime/config');
  return data;
}

export async function realtimeAuth(
  socketId: string,
  channelName: string,
): Promise<{ auth: string }> {
  const { data } = await apiClient.post<{ auth: string }>('/realtime/auth', {
    socket_id: socketId,
    channel_name: channelName,
  });
  return data;
}

/** Segundo fator do login com senha (backend: /auth/email-code). */
export interface EmailCodeStatus {
  required: boolean;
  verified: boolean;
}

export async function getEmailCodeStatus(): Promise<EmailCodeStatus> {
  const { data } = await apiClient.get<EmailCodeStatus>('/auth/email-code/status');
  return data;
}

/** O backend pede ao Supabase que envie o código para o e-mail da conta. */
export async function sendEmailCode(): Promise<void> {
  await apiClient.post('/auth/email-code/send');
}

export async function verifyEmailCode(code: string): Promise<void> {
  await apiClient.post('/auth/email-code/verify', { code });
}

/** Cadastro por e-mail, pelo backend: valida e diz se o e-mail, o CPF ou o celular já têm conta. */
export interface SignUpRequest {
  name: string;
  email: string;
  cpf: string;
  /** Opcional (Warpedro1/flyer-back#29). */
  phone?: string | null;
  password: string;
}

/** Resposta de `POST /auth/signup` (espelha `SignupOut`). */
export interface SignupResponse {
  ticket: string;
}

/**
 * Cria a conta (pendente). Devolve o bilhete que liga o código do e-mail a este
 * navegador (decisões 2026-10-14).
 */
export async function signUpWithEmail(req: SignUpRequest): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/auth/signup', req);
  return data;
}

/** Ativa a conta com o bilhete do navegador que fez o cadastro (depois do código). */
export async function activateSignup(ticket: string): Promise<void> {
  await apiClient.post('/auth/signup/activate', { ticket });
}

/** CPF e celular da própria conta (mascarados) e se já estão preenchidos. */
export interface ProfileStatus {
  complete: boolean;
  /** Cadastro por e-mail à espera do código no navegador que o fez. */
  pending?: boolean;
  cpf_masked: string | null;
  phone_masked: string | null;
  /** Introdução (Warpedro1/flyer#23): já terminou ou pulou o tour. */
  intro_seen: boolean;
  /** Já fez o onboarding do chat: o fim do tour leva à descoberta, não ao chat. */
  onboarded: boolean;
}

export async function getProfileStatus(): Promise<ProfileStatus> {
  const { data } = await apiClient.get<ProfileStatus>('/auth/profile/status');
  return data;
}

/** A introdução foi terminada ou pulada: não aparece de novo em nenhum aparelho. */
export async function markIntroSeen(): Promise<void> {
  await apiClient.post('/auth/profile/intro-seen');
}

/** Completa o cadastro (contas Google, no 1.º acesso). */
export async function completeProfileIdentity(req: { cpf: string; phone?: string | null }): Promise<void> {
  await apiClient.put('/auth/profile/identity', req);
}

/** Um erro apanhado pela tela de erro (#33), para `app_errors` (#25). */
export interface ClientErrorReport {
  message: string;
  route: string;
  code?: string;
  request_id?: string;
  stack?: string;
}

/**
 * Envia o erro ao backend com a referência que a tela mostra (vai como `X-Request-Id`
 * e fica no registo). Só com sessão (decisão 2026-10-16); nunca falha.
 */
export async function reportClientError(report: ClientErrorReport, reference: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await apiClient.post(
      '/telemetry/client-error',
      {
        ...report,
        message: report.message.slice(0, 500),
        route: report.route.slice(0, 200),
        stack: report.stack?.slice(0, 2000),
      },
      { headers: { 'X-Request-Id': reference } },
    );
  } catch {
    // Sem rede ou sem permissão: o erro fica na consola.
  }
}
