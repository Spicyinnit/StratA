import * as React from 'react';
import { ChatBox } from '@mui/x-chat';
import { ChatProvider } from '@mui/x-chat/headless';
import type { ChatConversation, ChatMessage } from '@mui/x-chat/headless';
import { Avatar, Snackbar } from '@mui/material';
import { apiFetch, toChatMessages, deleteConversationWith, leaveGroup, nameFor } from './api';
import { useRecentChats, type RecentChat } from './hooks/useSidebarChats';
import { useChatSocket } from './hooks/useChatWebSocket';
import { useAuth } from './UserSession';
import { useAppTheme } from './Theme';
import { WALLPAPERS } from './wallpapers';
import LoginPage from './LoginPage';
import { Sidebar } from './components/sidebar/Sidebar';
import BigMedia from './components/chat/BigMedia';
import MyProfile from './components/MyProfile';
import OtherProfile from './components/OtherProfile';
import GroupCreate from './components/GroupCreate';
import GroupSettings from './components/GroupSettings';
import ConfirmDeletion from './components/ConfirmDeletion';

function ChatApp() {
  const { user } = useAuth();
  const { wallpaper, mode, wallpaperPos } = useAppTheme();
  const wp = WALLPAPERS[wallpaper][mode];
  const meId = user!.id;
  const light = mode === 'light';

  // the app is keyed on a conversation, not on the other user
  const [conversationId, setConversationId] = React.useState<number | null>(
    () => Number(localStorage.getItem(`activeChat_${user!.id}`)) || null,
  );
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [viewUserId, setViewUserId] = React.useState<number | null>(null);
  const [groupOpen, setGroupOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [pending, setPending] = React.useState<RecentChat | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { recentChats, refresh, markRead, remove, setFlag } = useRecentChats(conversationId);

  // the row for whatever's open, so the header knows what to show
  const active = recentChats.find((c) => c.id === conversationId) ?? null;

  const conversations: ChatConversation[] = [
    { id: 'main', title: '', readState: 'read' },
  ];

  const openConversation = (c: RecentChat) => {
    markRead(c.id);
    setConversationId(c.id);
    localStorage.setItem(`activeChat_${meId}`, String(c.id));
  };

  // search and profile hand us a user, so resolve the DM first
  const openDmWith = async (userId: number) => {
    try {
      const res = await apiFetch(`/api/conversations/${meId}/${userId}/`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setConversationId(data.id);
      localStorage.setItem(`activeChat_${meId}`, String(data.id));
      refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not open that chat.');
    }
  };

  const handleDelete = (c: RecentChat) => setPending(c);

  const confirmDelete = async () => {
    const c = pending;
    if (!c) return;
    setPending(null);
    try {
      // leaving a group and deleting a DM are different actions
      if (c.is_group) {
        await leaveGroup(c.id);
      } else if (c.info.user_id) {
        await deleteConversationWith(c.info.user_id);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Something went wrong.');
      return;
    }
    remove(c.id);
    if (conversationId === c.id) {
      setConversationId(null);
      localStorage.removeItem(`activeChat_${meId}`);
    }
  };

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

  const { send } = useChatSocket(conversationId, loadMessages);

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
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: light ? '#E8DDC8' : '#14100E', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <Sidebar
        chats={recentChats}
        activeId={conversationId}
        onSelect={openConversation}
        onDelete={handleDelete}
        onSetFlag={(c, flag, value) => setFlag(c.id, flag, value)}
        onAvatarClick={(c) => {
          if (c.is_group) {
            setConversationId(c.id);
            localStorage.setItem(`activeChat_${meId}`, String(c.id));
            setSettingsOpen(true);
          } else if (c.info.user_id) {
            setViewUserId(c.info.user_id);
          }
        }}
        onOpenProfile={() => setProfileOpen(true)}
        onNewGroup={() => setGroupOpen(true)}
        onSearchSelect={setViewUserId}
      />

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
                onClick={() =>
                  active.is_group
                    ? setSettingsOpen(true)
                    : active.info.user_id && setViewUserId(active.info.user_id)
                }
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

      <MyProfile open={profileOpen} onClose={() => setProfileOpen(false)} />

      <OtherProfile
        userId={viewUserId}
        onClose={() => setViewUserId(null)}
        onMessage={(u) => {
          openDmWith(u.user_id);
          setViewUserId(null);
        }}
        onNicknameSaved={refresh}
      />

      <GroupCreate
        open={groupOpen}
        meId={meId}
        onClose={() => setGroupOpen(false)}
        onCreated={(group) => {
          setGroupOpen(false);
          setConversationId(group.id);
          localStorage.setItem(`activeChat_${meId}`, String(group.id));
          refresh();
        }}
      />

      <GroupSettings
        open={settingsOpen}
        conversationId={conversationId}
        meId={meId}
        onClose={() => setSettingsOpen(false)}
        onUpdated={refresh}
      />

      <ConfirmDeletion
        open={!!pending}
        title={pending?.is_group ? 'Leave group?' : 'Delete chat?'}
        message={
          pending?.is_group
            ? `You won't receive messages from ${pending ? nameFor(pending.info) : ''}.`
            : `This deletes the chat with ${pending ? nameFor(pending.info) : ''} for both of you.`
        }
        confirmLabel={pending?.is_group ? 'Leave' : 'Delete'}
        onCancel={() => setPending(null)}
        onConfirm={confirmDelete}
      />

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg(null)}
        message={errorMsg}
      />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  return user ? <ChatApp /> : <LoginPage />;
}