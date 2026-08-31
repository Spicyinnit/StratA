export const API_BASE = `http://${window.location.hostname}:8000`;
export const TAG_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;


export function guessMediaType(url: string) {
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

export function toChatMessages(apiMessages: any[], meId: number) {
  return apiMessages.map((m) => ({
    id: String(m.id),
    conversationId: 'main',
    createdAt: m.timestamp,
    role: m.sender === meId ? 'user' as const : 'assistant' as const,
    author: {
      id: String(m.sender),
      displayName: m.sender_name ?? 'Unknown',
      avatarUrl: m.sender_avatar || undefined, // already an absolute URL from the API... don't prepend API_BASE
    },
    parts: [
      ...(m.text ? [{ type: 'text' as const, text: m.text }] : []),
      ...(m.image ? [{type: 'file' as const,url: m.image.startsWith('http') ? m.image : `${API_BASE}${m.image}`, mediaType: guessMediaType(m.image),}] : []),
    ],
  }));
}

export function getToken(): string | null {
  const raw = localStorage.getItem('auth');
  if (!raw) return null;
  try {
    return JSON.parse(raw).token ?? null;
  } catch {
    return raw;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Token ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('auth');
    window.location.reload();
  }
  return res;
}

export async function deleteConversationWith(otherUserId: number) {
  const res = await apiFetch(`/api/conversations/with/${otherUserId}/delete/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Delete failed');
}

// NEW — takes a conversation id now, works for DMs and groups
export function markConversationRead(conversationId: number) {
  return apiFetch(`/api/conversations/${conversationId}/mark-read/`, { method: 'POST' });
}


// NEW — sidebar list: DMs and groups in one call

export type ConversationInfo = {
  display_name: string;
  tag: string | null;
  avatar: string | null;
  user_id: number | null;      // null for groups
  member_count: number;
};

export type ConversationSummary = {
  id: number;
  is_group: boolean;
  info: ConversationInfo;
  last_message: { id: number; preview: string; timestamp: string; sender_id: number } | null;
  unread_count: number;
};

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await apiFetch('/api/conversations/');
  if (!res.ok) throw new Error('Failed to load conversations');
  return res.json();
}


// NEW — groups

export type GroupMember = {
  user_id: number;
  tag: string;
  display_name: string;
  avatar: string | null;
  is_owner: boolean;
};

export type GroupDetail = {
  id: number;
  is_group: true;
  name: string;
  avatar_url: string | null;
  owner: number | null;
  members: GroupMember[];
  created_at: string;
};

export async function createGroup(name: string, participantIds: number[]): Promise<GroupDetail> {
  const res = await apiFetch('/api/groups/create/', {
    method: 'POST',
    body: JSON.stringify({ name, participant_ids: participantIds }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? 'Could not create group');
  return res.json();
}

export async function fetchGroup(conversationId: number): Promise<GroupDetail> {
  const res = await apiFetch(`/api/groups/${conversationId}/`);
  if (!res.ok) throw new Error('Failed to load group');
  return res.json();
}

export async function addGroupMembers(conversationId: number, participantIds: number[]): Promise<GroupDetail> {
  const res = await apiFetch(`/api/groups/${conversationId}/members/add/`, {
    method: 'POST',
    body: JSON.stringify({ participant_ids: participantIds }),
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? 'Could not add members');
  return res.json();
}

export async function removeGroupMember(conversationId: number, userId: number): Promise<GroupDetail> {
  const res = await apiFetch(`/api/groups/${conversationId}/members/${userId}/remove/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error((await res.json()).detail ?? 'Could not remove member');
  return res.json();
}

export async function leaveGroup(conversationId: number): Promise<void> {
  const res = await apiFetch(`/api/groups/${conversationId}/leave/`, { method: 'POST' });
  if (!res.ok) throw new Error('Could not leave group');
}