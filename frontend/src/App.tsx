import * as React from 'react';
import { ChatBox } from '@mui/x-chat';
import { ChatProvider } from '@mui/x-chat/headless';
import type { ChatConversation, ChatMessage } from '@mui/x-chat/headless';
import { Avatar, IconButton, Snackbar, ToggleButton } from '@mui/material';
import { apiFetch, toChatMessages, deleteConversationWith, leaveGroup, nameFor } from './api';
import { useRecentChats, type RecentChat } from './hooks/useRecentChats';
import { useChatSocket } from './hooks/useChatSocket';
import { SearchBar } from './components/SearchBar';
import { RecentChatsList } from './components/RecentChatsList';
import ProfileDialog from './components/ProfileDialog';
import BigImage from './components/BigImage';
import { useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import { useAppTheme } from './Themes';
import { WALLPAPERS } from './wallpapers';
import OtherUserProfile from './components/OtherUserProfile';
import ConfirmDialog from './components/ConfirmDialog';
import NewGroupDialog from './components/NewGroupDialog';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ArchiveIcon from '@mui/icons-material/Archive';

function ChatApp() {
  const { user, profile } = useAuth();
  const { wallpaper, mode, wallpaperPos } = useAppTheme();
  const wp = WALLPAPERS[wallpaper][mode];
  const meId = user!.id;
  const light = mode === 'light';

  // NEW — the app is keyed on a conversation now, not on the other user
  const [conversationId, setConversationId] = React.useState<number | null>(
    () => Number(localStorage.getItem(`activeChat_${user!.id}`)) || null,
  );
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [viewUserId, setViewUserId] = React.useState<number | null>(null);
  const [groupOpen, setGroupOpen] = React.useState(false);          // NEW
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [pending, setPending] = React.useState<RecentChat | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);

const { recentChats, refresh, markRead, remove, setFlag } = useRecentChats(conversationId);

  // the row for whatevers open the header knows what to show
  const active = recentChats.find((c) => c.id === conversationId) ?? null;

  const conversations: ChatConversation[] = [
    { id: 'main', title: active ? nameFor(active.info) : 'No chat selected', readState: 'read' },
  ];

  const openConversation = (c: RecentChat) => {
    markRead(c.id);
    setConversationId(c.id);
    localStorage.setItem(`activeChat_${meId}`, String(c.id));
  };

  // NEW — search and profile hand us a user, so resolve the DM first
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
      // NEW — leaving a group and deleting a DM are different actions
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

  React.useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    loadMessages();
  }, [loadMessages, conversationId]);

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
      <div style={{ width: 280, flexShrink: 0, background: light ? '#F5EDE2' : '#1C1815', borderRight: `1px solid ${light ? '#D9CBAE' : '#2A2320'}`, display: 'flex', flexDirection: 'column', padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <IconButton onClick={() => setProfileOpen(true)} sx={{ p: 0.5 }}>
            <Avatar src={profile?.avatar ?? undefined} sx={{ width: 40, height: 40 }}>
              {(profile?.display_name || user!.username)[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
          <span style={{ color: light ? '#2A211A' : '#F5EDE2', fontWeight: 600, fontSize: 14 }}>
            {profile?.display_name || user!.username}
          </span>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <IconButton onClick={() => setGroupOpen(true)} size="small" sx={{ color: light ? '#C2410C' : '#E2571E' }} title="New group">
              <GroupAddIcon fontSize="small" />
            </IconButton>
            <ToggleButton
              value="archived"
              selected={showArchived}
              onChange={() => setShowArchived((v) => !v)}
              size="small"
              sx={{ border: 'none', color: light ? '#8A7A62' : '#9A8D82', '&.Mui-selected': { color: light ? '#C2410C' : '#E2571E' } }}
              title="Archive"
            >
              <ArchiveIcon fontSize="small" />
            </ToggleButton>
          </div>
        </div>

        <SearchBar meId={meId} onSelect={(u) => setViewUserId(u.user_id)} />

        <RecentChatsList
          chats={recentChats}
          activeId={conversationId}
          showArchived={showArchived}
          onSelect={openConversation}
          onDelete={handleDelete}
          onAvatarClick={(c) => c.info.user_id && setViewUserId(c.info.user_id)}
          onSetFlag={(c, flag, value) => setFlag(c.id, flag, value)}
        />

      </div>
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

  <div style={{ position: 'relative', height: '100%', zIndex: 1 }}>
            <ChatProvider adapter={adapter}>
              <ChatBox
                sx={{
                  backgroundColor: 'transparent',
                  height: '100%',
                  '& [data-is-own-message="true"] .MuiChatMessage-bubble': {
                    backgroundColor: light ? '#F7DDCC' : '#E2571E',
                    color: light ? '#5C2408' : '#FFFFFF',
                  },
                  '& .MuiChatMessage-inlineMeta': {
                    color: 'inherit',
                    opacity: 0.65,
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
                        slots: {
                          root: (props: any) => {
                            const msg = messages.find((m: any) => String(m.id) === String(props.ownerState?.messageId));
                            const filePart: any = msg?.parts?.find((p: any) => p.type === 'file');
                            if (!filePart?.url) return null;
                            return <BigImage part={filePart} />;
                          },
                        },
                      },
                    },
                  },
                }}
              />
            </ChatProvider>
          </div>
        </div>
      </div>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <OtherUserProfile
        userId={viewUserId}
        onClose={() => setViewUserId(null)}
        onMessage={(u) => {
          openDmWith(u.user_id);
          setViewUserId(null);
        }}
        onNicknameSaved={refresh}
      />

      {/* NEW */}
      <NewGroupDialog
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

      <ConfirmDialog
        open={!!pending}
        title={pending?.is_group ? 'Leave group?' : 'Delete chat?'}
        message={
          pending?.is_group
            ? `You'll stop receiving messages from ${pending ? nameFor(pending.info) : ''}.`
            : `This erases all messages with ${pending ? nameFor(pending.info) : ''} for both of you.`
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