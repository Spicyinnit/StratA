import type { RecentContact } from '../hooks/useRecentChats';

type Props = {
  chats: RecentContact[];
  activeId: number;
  onSelect: (c: RecentContact) => void;
  onDelete: (c: RecentContact) => void;
  onAvatarClick: (c: RecentContact) => void;
  unreadCounts: Record<number, number>;
};

export function RecentChatsList({ chats, activeId, onSelect, onDelete, onAvatarClick, unreadCounts }: Props) {
  if (chats.length === 0) {
    return (
      <div style={{ color: '#8a7854', fontSize: 13, padding: '8px 4px' }}>
        No chats yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
      {chats.map((c) => (
        <div
          key={c.user_id}
          onClick={() => onSelect(c)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: activeId === c.user_id ? '#3a3a3a' : 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            if (activeId !== c.user_id) e.currentTarget.style.background = '#333333';
          }}
          onMouseLeave={(e) => {
            if (activeId !== c.user_id) e.currentTarget.style.background = 'transparent';
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick(c);
            }}
            title="View profile"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#FF6D1F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#222222',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            {c.avatar ? (
              <img src={c.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              c.tag[0].toUpperCase()
            )}
          </div>
          <span style={{ color: '#FAF3E1', fontSize: 15 }}>{c.tag}</span>
          {unreadCounts[c.user_id] > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                background: '#FF6D1F',
                color: '#222222',
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
              {unreadCounts[c.user_id] > 99 ? '99+' : unreadCounts[c.user_id]}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(c);
            }}
            style={{
              marginLeft: unreadCounts[c.user_id] > 0 ? 6 : 'auto',
              background: 'none',
              border: 'none',
              color: '#8a7854',
              cursor: 'pointer',
              fontSize: 16,
              padding: '0 4px',
              lineHeight: 1,
            }}
            title="Delete chat"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}