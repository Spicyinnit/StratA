import * as React from 'react';
import { ChatBox } from '@mui/x-chat';
import type { ChatConversation, ChatMessage } from '@mui/x-chat/headless';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { API_BASE, USERS, toChatMessages } from './api';
import { useRecentChats, type RecentContact } from './hooks/useRecentChats';
import { SearchBar } from './components/SearchBar';
import { RecentChatsList } from './components/RecentChatsList';
import { ProfileTab } from './components/ProfileTab';
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
  const [meId, setMeId] = React.useState<1 | 2>(1);
  const [otherId, setOtherId] = React.useState<number>(2);
  const [otherUser, setOtherUser] = React.useState<{ handle: string; avatar: string | null } | null>(null);
  const [activeTab, setActiveTab] = React.useState<'chats' | 'profile'>('chats');
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<number | null>(null);
  const { recentChats, addOrBump } = useRecentChats(meId);

  const conversations: ChatConversation[] = [
    { id: 'main', title: `Chat with ${otherUser?.handle ?? USERS[otherId] ?? 'Unknown'}`, readState: 'read' },
  ];

  const openChat = (contact: RecentContact) => {
    setOtherId(contact.user_id);
    setOtherUser({ handle: contact.handle, avatar: contact.avatar });
    addOrBump(contact);
  };

  // Hits get_or_create_conversation, which returns the conversation object
  // (including its real id + nested messages). We stash the id so sendMessage

  const loadMessages = React.useCallback(() => {
    fetch(`${API_BASE}/api/conversations/${meId}/${otherId}/`)
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
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [loadMessages]);

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
        formData.append('sender_id', String(meId));
        formData.append('text', text);
        if (attachments[0]) formData.append('image', attachments[0].file);

        const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/send/`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          console.error('send failed', res.status);
        }
        loadMessages();
        return new ReadableStream({ start(controller) { controller.close(); } });
      },
    }),
    [meId, conversationId, loadMessages],
  );

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: '#222222', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ width: 280, flexShrink: 0, background: '#2a2a2a', borderRight: '1px solid #3a3a3a', display: 'flex', flexDirection: 'column', padding: '20px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('chats')}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: activeTab === 'chats' ? '#FF6D1F' : '#3a3a3a', color: activeTab === 'chats' ? '#222222' : '#FAF3E1', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: activeTab === 'profile' ? '#FF6D1F' : '#3a3a3a', color: activeTab === 'profile' ? '#222222' : '#FAF3E1', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Profile
          </button>
        </div>

        {activeTab === 'chats' && (
          <>
            <SearchBar meId={meId} onSelect={(u) => openChat({ user_id: u.user_id, handle: u.handle, avatar: u.avatar })} />
            <RecentChatsList chats={recentChats} activeId={otherId} onSelect={openChat} />
          </>
        )}

        {activeTab === 'profile' && <ProfileTab meId={meId} />}

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #3a3a3a' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {([1, 2] as const).map((id) => (
              <button
                key={id}
                onClick={() => setMeId(id)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #3a3a3a', background: meId === id ? '#FF6D1F' : 'transparent', color: meId === id ? '#222222' : '#8a7854', fontWeight: meId === id ? 600 : 400, fontSize: 13, cursor: 'pointer' }}
              >
                {USERS[id]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: 24 }}>
        <div style={{ flex: 1, background: '#FAF3E1', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          <ThemeProvider theme={retroTheme}>
            <ChatBox
              adapter={adapter}
              conversations={conversations}
              activeConversationId="main"
              messages={messages}
              features={{ conversationList: false }}
              onMessagesChange={setMessages}
            />
          </ThemeProvider>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  return <ChatApp />;
}