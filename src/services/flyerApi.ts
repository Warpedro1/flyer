import axios from 'axios';

import { apiClient } from '../lib/apiClient.ts';
import type {
  AttendeeListRead,
  ChatMessageIn,
  ChatMessageOut,
  ChatSyncResponse,
  CheckInRequest,
  CompleteOnboardingAnswers,
  CompleteOnboardingResponse,
  DiscoverRequest,
  EventCreate,
  EventRead,
  FollowAction,
  FollowCreatedResponse,
  OkResponse,
  PendingFollowOut,
  PlanRead,
  ProfileBrief,
  RsvpQrToken,
  RsvpRead,
  ScanResult,
  TrophyRead,
} from '../types/index.ts';

export async function discoverEvents(req: DiscoverRequest): Promise<EventRead[]> {
  const { data } = await apiClient.post<EventRead[]>('/events/discover', req);
  return data;
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

export async function getEventById(eventId: string): Promise<EventRead> {
  const { data } = await apiClient.get<EventRead>(`/events/${encodeURIComponent(eventId)}`);
  return data;
}

export async function getMyEvents(): Promise<EventRead[]> {
  const { data } = await apiClient.get<EventRead[]>('/events/mine');
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

export async function getRsvpQrToken(eventId: string): Promise<RsvpQrToken> {
  const { data } = await apiClient.get<RsvpQrToken>(
    `/events/${encodeURIComponent(eventId)}/rsvp/qr`,
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

export async function scanTicket(eventId: string, token: string): Promise<ScanResult> {
  const { data } = await apiClient.post<ScanResult>(
    `/events/${encodeURIComponent(eventId)}/attendance/scan`,
    { token },
  );
  return data;
}
