import { apiClient } from '../lib/apiClient.ts';
import type {
  ChatMessageIn,
  ChatMessageOut,
  ChatSyncResponse,
  CheckInRequest,
  DiscoverRequest,
  EventCreate,
  EventRead,
  FollowAction,
  FollowCreatedResponse,
  OkResponse,
  PendingFollowOut,
  PlanRead,
  ProfileBrief,
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
