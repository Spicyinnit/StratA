import * as React from 'react';
import { ChatBox } from '@mui/x-chat';
import type { ChatConversation, ChatMessage } from '@mui/x-chat/headless';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Avatar, IconButton } from '@mui/material';
import { apiFetch, toChatMessages } from './api';
import { useRecentChats, type RecentContact } from './hooks/useRecentChats';
import { SearchBar } from './components/SearchBar';
import { RecentChatsList } from './components/RecentChatsList';
import ProfileDialog from './components/ProfileDialog';
import { useAuth } from './AuthContext';
import LoginPage from './LoginPage';

const retroTheme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#FAF3E1', paper: '#FAF3E1' },
    primary: { main: '#FF6D1F' },
    text: { primary: '#222222', secondary: '#8a7854' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPaper: { styleOverrides: { root: { border: '1px solid #d8cba8' } } },
  },
});

function ChatApp() {
  const { user } = useAuth();
  const meId = user!.id;

  const [otherId, setOtherId] = React.useState<number | null>(null);
  const [otherUser, setOtherUser] = React.useState<{ handle: string; avatar: string | null } | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<number | null>(null);
  const { recentChats, addOrBump } = useRecentChats(meId);

  const conversations: ChatConversation[] = [
    { id: 'main', title: otherUser ? `Chat with ${otherUser.handle}` : 'No chat selected', readState: 'read' },
  ];

  const openChat = (contact: RecentContact) => {
    setOtherId(contact.user_id);
    setOtherUser({ handle: contact.handle, avatar: contact.avatar });
    addOrBump(contact);
  };

  // Hits get_or_create_conversation, which returns the conversation object
  // (including its real id + nested messages). We stash the id so sendMessage
  // knows where to post.
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

  React.useEffect(() => {
    if (!otherId) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [loadMessages, otherId]);

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

        const formData = new FormData();
        formData.append('text', text);            // sender comes from the token now
        if (attachments[0]) formData.append('image', attachments[0].file);

        const res = await apiFetch(`/api/conversations/${conversationId}/send/`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) console.error('send failed', res.status);

        loadMessages();
        return new ReadableStream({ start(controller) { controller.close(); } });
      },
    }),
    [conversationId, loadMessages],
  );

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: '#222222', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ width: 280, flexShrink: 0, background: '#2a2a2a', borderRight: '1px solid #3a3a3a', display: 'flex', flexDirection: 'column', padding: '20px 16px' }}>
        {/* logo button -> profile + settings popup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <IconButton onClick={() => setProfileOpen(true)} sx={{ p: 0.5 }}>
            <Avatar src="/logo.png" sx={{ width: 40, height: 40 }} />
          </IconButton>
          <span style={{ color: '#FAF3E1', fontWeight: 600, fontSize: 14 }}>{user!.username}</span>
        </div>

        <SearchBar meId={meId} onSelect={(u) => openChat({ user_id: u.user_id, handle: u.handle, avatar: u.avatar })} />
        <RecentChatsList chats={recentChats} activeId={otherId ?? -1} onSelect={openChat} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: 24 }}>
        <div style={{ flex: 1, background: '#FAF3E1', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <ChatBox
              adapter={adapter}
              conversations={conversations}
              activeConversationId="main"
              messages={messages}
              features={{ conversationList: false }}
              onMessagesChange={setMessages}
            />
        </div>
      </div>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <ThemeProvider theme={retroTheme}>
      {user ? <ChatApp /> : <LoginPage />}
    </ThemeProvider>
  );
}