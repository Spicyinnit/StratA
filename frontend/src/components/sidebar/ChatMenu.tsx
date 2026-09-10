import * as React from 'react';
import { Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { RecentChat } from '../../hooks/useSidebarChats';

type Flag = 'pinned' | 'muted' | 'archived';

type Props = {
  chat: RecentChat;
  color: string;
  onSetFlag: (c: RecentChat, flag: Flag, value: boolean) => void;
  onDelete: (c: RecentChat) => void;
};

export function ChatMenu({ chat, color, onSetFlag, onDelete }: Props) {
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  const toggle = (flag: Flag) => {
    onSetFlag(chat, flag, !chat[flag]);
    close();
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
        title="Options"
        style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
      >
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </button>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => toggle('pinned')}>{chat.pinned ? 'Unpin' : 'Pin'}</MenuItem>
        <MenuItem onClick={() => toggle('muted')}>{chat.muted ? 'Unmute' : 'Mute'}</MenuItem>
        <MenuItem onClick={() => toggle('archived')}>{chat.archived ? 'Unarchive' : 'Archive'}</MenuItem>
        <MenuItem onClick={() => { onDelete(chat); close(); }} sx={{ color: '#D14343' }}>
          {chat.is_group ? 'Leave group' : 'Delete chat'}
        </MenuItem>
      </Menu>
    </>
  );
}