export const API_BASE = `http://${window.location.hostname}:8000`;
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
      displayName: m.sender_name ?? 'Unknown',
      avatarUrl: m.sender_avatar || undefined, // already an absolute URL from the API... don't prepend API_BASE
    },
    parts: [
      ...(m.text ? [{ type: 'text' as const, text: m.text }] : []),
      ...(m.image ? [{
      type: 'file' as const,url: m.image.startsWith('http') ? m.image : `${API_BASE}${m.image}`, mediaType: guessMediaType(m.image),}] : []),
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