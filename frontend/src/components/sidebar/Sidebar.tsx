import * as React from 'react';
import { Avatar, IconButton, ToggleButton } from '@mui/material';
// MUI icons
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ArchiveIcon from '@mui/icons-material/Archive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import PushPinIcon from '@mui/icons-material/PushPin';
import type { RecentChat } from '../../hooks/useSidebarChats';
import { useAppTheme } from '../../Theme';
import { useUserSession } from '../../UserSession';
import { nameFor } from '../../api';
import { SearchBar } from './SearchBar';
import { ChatMenu } from './ChatMenu';

type Props = {
  chats: RecentChat[];
  activeId: number | null;
  onSelect: (c: RecentChat) => void;
  onDelete: (c: RecentChat) => void;
  onAvatarClick: (c: RecentChat) => void;
  onSetFlag: (c: RecentChat, flag: 'pinned' | 'muted' | 'archived', value: boolean) => void;
  onOpenProfile: () => void;
  onNewGroup: () => void;
  onSearchSelect: (userId: number) => void;
};

export function Sidebar({
  chats, activeId, onSelect, onDelete, onAvatarClick, onSetFlag,
  onOpenProfile, onNewGroup, onSearchSelect,
}: Props) {
  const { user, profile } = useUserSession();
  const { mode } = useAppTheme();
  const light = mode === 'light';
  const [showArchived, setShowArchived] = React.useState(false);

  const accent = light ? '#C2410C' : '#E2571E';
  const textColor = light ? '#2A211A' : '#F5EDE2';
  const muted = light ? '#8A7A62' : '#9A8D82';
  const activeBg = light ? '#EDE3CE' : '#2A2320';
  const hoverBg = light ? '#F1E8D4' : '#241E1A';

  const visible = chats.filter((c) => c.archived === showArchived);
  const myName = profile?.display_name || user!.username;

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        background: light ? '#F5EDE2' : '#1C1815',
        borderRight: `1px solid ${light ? '#D9CBAE' : '#2A2320'}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
      }}
    >
      {/* header: my avatar, new group, archive */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <IconButton onClick={onOpenProfile} sx={{ p: 0.5 }}>
          <Avatar src={profile?.avatar ?? undefined} sx={{ width: 40, height: 40 }}>
            {myName[0]?.toUpperCase()}
          </Avatar>
        </IconButton>
        <span style={{ color: textColor, fontWeight: 600, fontSize: 14 }}>{myName}</span>

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <IconButton onClick={onNewGroup} size="small" sx={{ color: accent }} title="New group">
            <GroupAddIcon fontSize="small" />
          </IconButton>
          <ToggleButton
            value="archived"
            selected={showArchived}
            onChange={() => setShowArchived((v) => !v)}
            size="small"
            sx={{ border: 'none', color: muted, '&.Mui-selected': { color: accent } }}
            title="Archive"
          >
            <ArchiveIcon fontSize="small" />
          </ToggleButton>
        </div>
      </div>

      <SearchBar onSelect={(u) => onSearchSelect(u.user_id)} />

      {/* chats list */}
      {visible.length === 0 ? (
        <div style={{ color: muted, fontSize: 13, padding: '8px 4px' }}>
          {showArchived ? 'Nothing in Archive.' : 'No chats yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {visible.map((c) => {
            const active = activeId === c.id;
            const unread = c.unread_count;
            const showBadge = unread > 0;
            const label = nameFor(c.info); // nickname first

            return (
              <div
                key={c.id}
                onClick={() => onSelect(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: active ? activeBg : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onAvatarClick(c);
                  }}
                  title={c.is_group ? 'Group settings' : 'View profile'}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: c.is_group ? 10 : '50%',
                    background: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 600,
                    flexShrink: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  {c.info.avatar ? (
                    <img src={c.info.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    label[0]?.toUpperCase() ?? '?'
                  )}
                </div>

                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      color: textColor,
                      fontSize: 15,
                      opacity: c.muted ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {c.pinned && <PushPinIcon sx={{ fontSize: 14, mr: 0.5, color: accent, transform: 'rotate(45deg)' }} />}
                    {label}
                    {c.muted && <NotificationsOffIcon sx={{ fontSize: 14, ml: 0.5, color: muted }} />}
                  </span>
                  {c.is_group && (
                    <span style={{ color: muted, fontSize: 12 }}>{c.info.member_count} members</span>
                  )}
                </div>

                {showBadge && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: c.muted ? muted : accent,
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      padding: '0 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}

                <div style={{ marginLeft: showBadge ? 6 : 'auto' }}>
                  <ChatMenu chat={c} color={muted} onSetFlag={onSetFlag} onDelete={onDelete} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}