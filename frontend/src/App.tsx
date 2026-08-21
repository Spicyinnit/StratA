import * as React from 'react';    
import { ChatBox } from '@mui/x-chat';
import { ChatProvider } from '@mui/x-chat/headless';
import type { ChatConversation, ChatMessage } from '@mui/x-chat/headless';
import { Avatar, IconButton } from '@mui/material';
import { apiFetch, toChatMessages, deleteConversationWith } from './api';
import { useRecentChats, type RecentContact } from './hooks/useRecentChats';
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

function ChatApp() {
  const { user, profile } = useAuth();
  const { wallpaper, mode, wallpaperPos } = useAppTheme();
  const wp = WALLPAPERS[wallpaper][mode];
  const meId = user!.id;
  const [otherId, setOtherId] = React.useState<number | null>(
    () => Number(localStorage.getItem(`activeChat_${user!.id}`)) || null,
  );
  
  const [otherUser, setOtherUser] = React.useState<{ tag: string; avatar: string | null } | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [viewUserId, setViewUserId] = React.useState<number | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<number | null>(null);
  const { recentChats, addOrBump, remove, unreadCounts, markRead } = useRecentChats(meId, otherId);
  const conversations: ChatConversation[] = [
    { id: 'main', title: otherUser ? `Chat with ${otherUser.tag}` : 'No chat selected', readState: 'read' },
  ];

  const openChat = (contact: RecentContact) => {
    markRead(contact.user_id);
    setOtherId(contact.user_id);
    setOtherUser({ tag: contact.tag, avatar: contact.avatar });
    addOrBump(contact);
    localStorage.setItem(`activeChat_${meId}`, String(contact.user_id));
  };

  const handleDelete = async (contact: RecentContact) => {
    const name = contact.display_name || contact.tag;
    if (!confirm(`Delete your chat with ${name}? This erases all messages for both of you.`)) return;
    try {
      await deleteConversationWith(contact.user_id);
    } catch (err) {
      console.error(err);
      alert('Could not delete the chat.');
      return;
    }
    remove(contact.user_id);
    if (otherId === contact.user_id) {
      setOtherId(null);
      setOtherUser(null);
      localStorage.removeItem(`activeChat_${meId}`);
    }
  };

  const loadMessages = React.useCallback(() => {
    if (!otherId) return;
    apiFetch(`/api/conversations/${meId}/${otherId}/`)
      .then((res) => {
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setConversationId(data.id);
        setMessages(toChatMessages(data.messages, meId));
      })
      .catch((err) => console.error(err));
  }, [meId, otherId]);

  const { send } = useChatSocket(otherId, loadMessages);

  React.useEffect(() => {
    if (!otherId) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    loadMessages();
  }, [loadMessages, otherId]);

  React.useEffect(() => {
    if (!otherId || otherUser) return;
    apiFetch(`/api/users/${otherId}/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d && setOtherUser({ tag: d.tag, avatar: d.avatar }))
      .catch(() => {});
  }, [otherId, otherUser]);

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
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: mode === 'light' ? '#222222' : '#181818', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ width: 280, flexShrink: 0, background: '#2a2a2a', borderRight: '1px solid #3a3a3a', display: 'flex', flexDirection: 'column', padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <IconButton onClick={() => setProfileOpen(true)} sx={{ p: 0.5 }}>
            <Avatar src={profile?.avatar ?? undefined} sx={{ width: 40, height: 40 }}>
              {(profile?.display_name || user!.username)[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
          <span style={{ color: '#FAF3E1', fontWeight: 600, fontSize: 14 }}>
            {profile?.display_name || user!.username}
          </span>
        </div>

        <SearchBar meId={meId} onSelect={(u) => setViewUserId(u.user_id)} />
        <RecentChatsList chats={recentChats} activeId={otherId ?? -1} onSelect={openChat} onDelete={handleDelete} onAvatarClick={(c) => setViewUserId(c.user_id)} unreadCounts={unreadCounts} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: 24 }}>
        <div style={{
          flex: 1,
          position: 'relative',
          background: mode === 'light' ? '#FAF3E1' : '#2C2C2C',
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
              opacity: mode === 'dark' ? 0.1 : 0.2,
              pointerEvents: 'none',
              transition: 'background-position 0.35s ease',
            }} />
          )}

          <div style={{ position: 'relative', height: '100%', zIndex: 1 }}>
            <ChatProvider adapter={adapter}>
              <ChatBox
                sx={{ backgroundColor: 'transparent', height: '100%' }}
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
          openChat(u);
          setViewUserId(null);
        }}
      />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  return user ? <ChatApp /> : <LoginPage />;
}