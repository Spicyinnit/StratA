import * as React from 'react';
import { Snackbar } from '@mui/material';
import { apiFetch, deleteConversationWith, leaveGroup, nameFor } from './api';
import { useSidebarChats, type RecentChat } from './hooks/useSidebarChats';
import { useUserSession } from './UserSession';
import { useAppTheme } from './Theme';
import ChatPage from './ChatPage';
import { Sidebar } from './components/sidebar/Sidebar';
import MyProfile from './components/MyProfile';
import OtherProfile from './components/OtherProfile';
import GroupCreate from './components/GroupCreate';
import GroupSettings from './components/GroupSettings';
import ConfirmDeletion from './components/ConfirmDeletion';

export default function App() {
  const { user } = useUserSession();
  const { mode } = useAppTheme();
  const meId = user!.id;
  const light = mode === 'light';

  // which chat is open: Sidebar sets it, ChatPage reads it
  const [conversationId, setConversationId] = React.useState<number | null>(
    () => Number(localStorage.getItem(`activeChat_${meId}`)) || null,
  );
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [viewUserId, setViewUserId] = React.useState<number | null>(null);
  const [groupOpen, setGroupOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [pending, setPending] = React.useState<RecentChat | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { recentChats, refresh, markRead, remove, setFlag } = useSidebarChats(conversationId);

  // the row for whatever's open, so the header knows what to show
  const active = recentChats.find((c) => c.id === conversationId) ?? null;

  const selectChat = (id: number) => {
    setConversationId(id);
    localStorage.setItem(`activeChat_${meId}`, String(id));
  };

  const openConversation = (c: RecentChat) => {
    markRead(c.id);
    selectChat(c.id);
  };

  // group → settings, DM → their profile
  const openDetails = (c: RecentChat) => {
    if (c.is_group) {
      selectChat(c.id);
      setSettingsOpen(true);
    } else if (c.info.user_id) {
      setViewUserId(c.info.user_id);
    }
  };

  // search and profile hand us a user, so resolve the DM first
  const openDmWith = async (userId: number) => {
    try {
      const res = await apiFetch(`/api/conversations/${meId}/${userId}/`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      selectChat(data.id);
      refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not open that chat.');
    }
  };

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

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', background: light ? '#E8DDC8' : '#14100E', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <Sidebar
        chats={recentChats}
        activeId={conversationId}
        onSelect={openConversation}
        onDelete={setPending}
        onSetFlag={(c, flag, value) => setFlag(c.id, flag, value)}
        onAvatarClick={openDetails}
        onOpenProfile={() => setProfileOpen(true)}
        onNewGroup={() => setGroupOpen(true)}
        onSearchSelect={setViewUserId}
      />

      <ChatPage
        conversationId={conversationId}
        active={active}
        onHeaderClick={openDetails}
      />

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
          selectChat(group.id);
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