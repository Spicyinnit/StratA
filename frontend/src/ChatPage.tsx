import * as React from 'react';
import { ChatBox } from '@mui/x-chat';
import { ChatProvider } from '@mui/x-chat/headless';
import type { ChatConversation, ChatMessage } from '@mui/x-chat/headless';
import { Avatar } from '@mui/material';
import { apiFetch, toChatMessages, nameFor } from './api';
import type { RecentChat } from './hooks/useSidebarChats';
import { useChatWebSocket } from './hooks/useChatWebSocket';
import { useAuth } from './UserSession';
import { useAppTheme } from './Theme';
import { WALLPAPERS } from './wallpapers';
import BigMedia from './components/chat/BigMedia';

type Props = {
  conversationId: number | null;
  active: RecentChat | null;
  onHeaderClick: (c: RecentChat) => void;
};

// x-chat needs one conversation row to render; the real id lives in conversationId
const conversations: ChatConversation[] = [
  { id: 'main', title: '', readState: 'read' },
];

export default function ChatPage({ conversationId, active, onHeaderClick }: Props) {
  const { user } = useAuth();
  const { wallpaper, mode, wallpaperPos } = useAppTheme();
  const wp = WALLPAPERS[wallpaper][mode];
  const meId = user!.id;
  const light = mode === 'light';

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const loadMessages = React.useCallback(() => {
    if (!conversationId) return;
    apiFetch(`/api/conversations/${conversationId}/messages/`)
      .then((res) => {
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setMessages(toChatMessages(data, meId)))
      .catch((err) => console.error(err));
  }, [conversationId, meId]);

  const { send } = useChatWebSocket(conversationId, loadMessages);

  // read receipts: mark rows so the CSS can draw ✓✓
  React.useEffect(() => {
    document.querySelectorAll('[data-message-id]').forEach((row) => {
      const id = (row as HTMLElement).dataset.messageId;
      const msg: any = messages.find((m: any) => String(m.id) === id);
      if (msg?.isRead) row.setAttribute('data-read', 'true');
      else row.removeAttribute('data-read');
    });
  }, [messages]);

  React.useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    loadMessages();
  }, [loadMessages, conversationId]);

  const filePartRoot = React.useCallback((props: any) => {
    const msg = messages.find((m: any) => String(m.id) === String(props.ownerState?.messageId));
    const filePart: any = msg?.parts?.find((p: any) => p.type === 'file');
    if (!filePart?.url) return null;
    return <BigMedia key={String(msg?.id)} part={filePart} />;
  }, [messages]);

  const adapter = React.useMemo(
    () => ({
      async sendMessage(input: any) {
        if (!conversationId) {
          return new ReadableStream({ start(c) { c.close(); } });
        }

        const text = input.message?.parts?.[0]?.text ?? '';
        const attachments = input.attachments ?? [];
        if (!text.trim() && attachments.length === 0) {
          return new ReadableStream({ start(c) { c.close(); } });
        }

        // text goes over WebSocket, files go over REST
        const sentOverWs = attachments.length === 0 && send(text);

        if (!sentOverWs) {
          const formData = new FormData();
          formData.append('text', text);
          if (attachments[0]) formData.append('image', attachments[0].file);

          const res = await apiFetch(`/api/conversations/${conversationId}/send/`, {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) console.error('send failed', res.status);

          loadMessages();
        }

        return new ReadableStream({ start(controller) { controller.close(); } });
      },
    }),
    [conversationId, loadMessages, send],
  );

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: 24 }}>
      <div style={{
        flex: 1,
        position: 'relative',
        background: light ? '#FAF3E1' : '#221D1A',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        {wp && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${wp})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '2500px',
            backgroundPosition: wallpaperPos,
            opacity: mode === 'dark' ? 0.06 : 0.15,
            pointerEvents: 'none',
            transition: 'background-position 0.35s ease',
          }} />
        )}
        <div style={{ position: 'relative', height: '100%', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          {active && (
            <div
              onClick={() => onHeaderClick(active)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', cursor: 'pointer', flexShrink: 0,
                background: light ? '#FAF3E1' : '#1C1815',
                borderBottom: `1px solid ${light ? '#D9CBAE' : '#322B27'}`,
              }}
            >
              <Avatar
                src={active.info.avatar ?? undefined}
                variant={active.is_group ? 'rounded' : 'circular'}
                sx={{ width: 36, height: 36 }}
              >
                {nameFor(active.info)[0]?.toUpperCase()}
              </Avatar>
              <span style={{ color: light ? '#2A211A' : '#F5EDE2', fontWeight: 600, fontSize: 15 }}>
                {nameFor(active.info)}
              </span>
            </div>
          )}
          <ChatProvider adapter={adapter}>
            <ChatBox
              sx={{
                backgroundColor: 'transparent',
                flex: 1,
                minHeight: 0,
                '& .MuiChatConversation-header': { display: 'none' },
                '& [data-is-own-message="true"] .MuiChatMessage-bubble': {
                  backgroundColor: light ? '#F7DDCC' : '#E2571E',
                  color: light ? '#5C2408' : '#FFFFFF',
                },
                '& .MuiChatMessage-inlineMeta': {
                  color: 'inherit',
                  opacity: 0.65,
                },
                '& [data-is-own-message="true"] .MuiChatMessage-inlineMeta::after': {
                  content: '"✓"',
                  marginLeft: '4px',
                },
                '& [data-read="true"] [data-is-own-message="true"] .MuiChatMessage-inlineMeta::after': {
                  content: '"✓✓"',
                },
              }}
              adapter={adapter}
              conversations={conversations}
              activeConversationId="main"
              messages={messages}
              features={{ conversationList: false, dateDivider: true }}
              onMessagesChange={setMessages}
              slotProps={{
                messageList: { sx: { backgroundColor: 'transparent' } },
                messageContent: {
                  partProps: {
                    file: {
                      slots: { root: filePartRoot },
                    },
                  },
                },
              }}
            />
          </ChatProvider>
        </div>
      </div>
    </div>
  );
}