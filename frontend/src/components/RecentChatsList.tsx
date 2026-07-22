import * as React from 'react';
import { API_BASE } from '../api';
import type { RecentContact } from '../hooks/useRecentChats';

type Props = {
  chats: RecentContact[];
  activeId: number;
  onSelect: (c: RecentContact) => void;
};

export function RecentChatsList({ chats, activeId, onSelect }: Props) {
  if (chats.length === 0) {
    return (
      <div style={{ color: '#8a7854', fontSize: 13, padding: '8px 4px' }}>
        No chats yet — search a handle above to start one.
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
            }}
          >
            {c.avatar ? (
              <img src={`${API_BASE}${c.avatar}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              c.handle[0].toUpperCase()
            )}
          </div>
          <span style={{ color: '#FAF3E1', fontSize: 15 }}>{c.handle}</span>
        </div>
      ))}
    </div>
  );
}