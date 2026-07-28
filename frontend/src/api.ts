export const API_BASE = `http://${window.location.hostname}:8000`;
export const USERS: Record<number, string> = { 1: 'miko', 2: 'Misha' };
export const HANDLE_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export function guessMediaType(url: string) {
  const ext = url.split('.').pop()?.toLowerCase();
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
    role: m.sender === meId ? 'user' as const : 'assistant' as const,
    author: {
      id: String(m.sender),
      displayName: USERS[m.sender] ?? 'Unknown',
      avatarUrl: m.sender_avatar || undefined, // already an absolute URL from the API, don't prepend API_BASE
    },
    parts: [
      ...(m.text ? [{ type: 'text' as const, text: m.text }] : []),
      ...(m.image ? [{ type: 'file' as const, url: `${API_BASE}${m.image}`, mediaType: guessMediaType(m.image) }] : []),
    ],
  }));
}