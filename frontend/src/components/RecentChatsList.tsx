import * as React from 'react';
import type { RecentChat } from '../hooks/useRecentChats';
import { useAppTheme } from '../Themes';
import { nameFor } from '../api';
//django icon imports
import { Menu, MenuItem, } from '@mui/material';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';


type Props = {
  chats: RecentChat[];
  activeId: number | null;
  showArchived: boolean;
  onSelect: (c: RecentChat) => void;
  onDelete: (c: RecentChat) => void;
  onAvatarClick: (c: RecentChat) => void;
  onSetFlag: (c: RecentChat, flag: 'pinned' | 'muted' | 'archived', value: boolean) => void;
};

export function RecentChatsList({ chats, activeId, onSelect, onDelete, onAvatarClick, onSetFlag, showArchived }: Props) {
  const { mode } = useAppTheme();
  const light = mode === 'light';

  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [menuChat, setMenuChat] = React.useState<RecentChat | null>(null);
  const closeMenu = () => { setMenuAnchor(null); setMenuChat(null); };

  const accent = light ? '#C2410C' : '#E2571E';
  const textColor = light ? '#2A211A' : '#F5EDE2';
  const muted = light ? '#8A7A62' : '#9A8D82';
  const activeBg = light ? '#EDE3CE' : '#2A2320';
  const hoverBg = light ? '#F1E8D4' : '#241E1A';

  const visible = chats.filter((c) => c.archived === showArchived);

  if (visible.length === 0) {
    return (
      <div>
        <div style={{ color: muted, fontSize: 13, padding: '8px 4px' }}>
          {showArchived ? 'Nothing in Archive.' : 'No chats yet.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
      {visible.map((c) => {
        const active = activeId === c.id;
        const unread = c.unread_count;
        const showBadge = unread > 0;
        const label = nameFor(c.info);   // nickname first

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
                // click bosuna gitmesin
                if (c.is_group) return;
                e.stopPropagation();
                onAvatarClick(c);
              }}
              title={c.is_group ? undefined : 'View profile'}
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
                cursor: c.is_group ? 'inherit' : 'pointer',
              }}
            >
              {c.info.avatar ? (
                <img src={c.info.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                label[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: textColor, fontSize: 15, opacity: c.muted ? 0.6 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                {c.pinned && <PushPinIcon sx={{ fontSize: 14, mr: 0.5, color: accent, transform: 'rotate(45deg)' }} />}
                {label}
                {c.muted && <NotificationsOffIcon sx={{ fontSize: 14, ml: 0.5, color: muted }} />}
              </span>
              {c.is_group && (
                <span style={{ color: muted, fontSize: 12 }}>
                  {c.info.member_count} members
                </span>
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

            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchor(e.currentTarget);
                setMenuChat(c);
              }}
              style={{
                marginLeft: showBadge ? 6 : 'auto',
                background: 'none',
                border: 'none',
                color: muted,
                cursor: 'pointer',
                fontSize: 18,
                padding: '0 4px',
                lineHeight: 1,
              }}
              title="Options">
            <MoreVertIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        );
      })}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => { onSetFlag(menuChat!, 'pinned', !menuChat!.pinned); closeMenu(); }}>
          {menuChat?.pinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <MenuItem onClick={() => { onSetFlag(menuChat!, 'muted', !menuChat!.muted); closeMenu(); }}>
          {menuChat?.muted ? 'Unmute' : 'Mute'}
        </MenuItem>
        <MenuItem onClick={() => { onSetFlag(menuChat!, 'archived', !menuChat!.archived); closeMenu(); }}>
          {menuChat?.archived ? 'Unarchive' : 'Archive'}
        </MenuItem>
        <MenuItem onClick={() => { onDelete(menuChat!); closeMenu(); }} sx={{ color: '#D14343' }}>
          {menuChat?.is_group ? 'Leave group' : 'Delete chat'}
        </MenuItem>
      </Menu>
    </div>
  );
}