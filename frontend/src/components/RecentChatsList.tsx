import type { RecentChat } from '../hooks/useRecentChats';
import { useAppTheme } from '../Themes';

type Props = {
  chats: RecentChat[];
  activeId: number | null;              // NEW — conversation id, not user id
  onSelect: (c: RecentChat) => void;
  onDelete: (c: RecentChat) => void;
  onAvatarClick: (c: RecentChat) => void;
};

export function RecentChatsList({ chats, activeId, onSelect, onDelete, onAvatarClick }: Props) {
  const { mode } = useAppTheme();
  const light = mode === 'light';

  const accent = light ? '#C2410C' : '#E2571E';
  const textColor = light ? '#2A211A' : '#F5EDE2';
  const muted = light ? '#8A7A62' : '#9A8D82';
  const activeBg = light ? '#EDE3CE' : '#2A2320';
  const hoverBg = light ? '#F1E8D4' : '#241E1A';

  if (chats.length === 0) {
    return (
      <div style={{ color: muted, fontSize: 13, padding: '8px 4px' }}>
        No chats yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
      {chats.map((c) => {
        const active = activeId === c.id;
        const unread = c.unread_count;
        const label = c.info.display_name;

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
                // NEW — groups have no profile to open, so don't swallow the click
                if (c.is_group) return;
                e.stopPropagation();
                onAvatarClick(c);
              }}
              title={c.is_group ? undefined : 'View profile'}
              style={{
                width: 32,
                height: 32,
                borderRadius: c.is_group ? 10 : '50%',   // NEW — squircle marks a group
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
              <span style={{ color: textColor, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
              {/* NEW — member count so groups read as groups at a glance */}
              {c.is_group && (
                <span style={{ color: muted, fontSize: 12 }}>
                  {c.info.member_count} members
                </span>
              )}
            </div>

            {unread > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: accent,
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
                onDelete(c);
              }}
              style={{
                marginLeft: unread > 0 ? 6 : 'auto',
                background: 'none',
                border: 'none',
                color: muted,
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
                lineHeight: 1,
              }}
              title={c.is_group ? 'Leave group' : 'Delete chat'}   // NEW
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}