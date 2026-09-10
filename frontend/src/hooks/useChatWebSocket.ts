import * as React from 'react';

const WS_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8000')
  .replace(/^http/, 'ws')
  .replace(/\/$/, '');

export function useChatWebSocket(conversationId: number | null, onMessage: () => void) {
  const sockRef = React.useRef<WebSocket | null>(null);
  const cbRef = React.useRef(onMessage);
  cbRef.current = onMessage;

  React.useEffect(() => {
    if (!conversationId) return;

    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const token = auth.token;
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/chat/${conversationId}/?token=${token}`);
    sockRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'message.new') cbRef.current();
      if (data.type === 'read_receipt' && data.reader_id !== auth.user_id) {
        cbRef.current();
      }
    };
    ws.onclose = (e) => {
      if (e.code === 4003) console.warn('ws rejected — not a participant of', conversationId);
    };

    return () => {
      sockRef.current = null;
      if (ws.readyState === WebSocket.OPEN) ws.close();
      else ws.onopen = () => ws.close();
    };
  }, [conversationId]);

  const send = React.useCallback((text: string) => {
    const ws = sockRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'message.send', text }));
      return true;
    }
    return false;
  }, []);

  return { send };
}