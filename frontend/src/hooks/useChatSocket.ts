import * as React from 'react';

const WS_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8000')
  .replace(/^http/, 'ws')
  .replace(/\/$/, '');

export function useChatSocket(otherId: number | null, onMessage: () => void) {
  const sockRef = React.useRef<WebSocket | null>(null);
  const cbRef = React.useRef(onMessage);
  cbRef.current = onMessage;

  React.useEffect(() => {
    if (!otherId) return;

    const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
    if (!token) return;
        console.log("OPENING SOCKET for", otherId);

    const ws = new WebSocket(`${WS_BASE}/ws/chat/${otherId}/?token=${token}`);
    sockRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'message.new') cbRef.current();
    };
    ws.onclose = (e) => console.log("ws closed", e.code, "for", otherId);

    return () => {
      sockRef.current = null;
      if (ws.readyState === WebSocket.OPEN) ws.close();
      else ws.onopen = () => ws.close();
    };
  }, [otherId]);

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