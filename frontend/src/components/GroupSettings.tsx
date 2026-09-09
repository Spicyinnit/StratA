import * as React from 'react';
import { apiFetch, fetchGroup, updateGroup, removeGroupMember, addGroupMembers, type GroupDetail } from '../api';
import {
  Dialog, DialogContent, DialogActions, Button, Avatar,
  IconButton, TextField, Box, Typography, List, ListItem, ListItemAvatar,
  ListItemText, ListItemButton, Alert, CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';

type Found = { user_id: number; tag: string; display_name: string; avatar: string | null };

type Props = {
  open: boolean;
  conversationId: number | null;
  meId: number;
  onClose: () => void;
  onUpdated: () => void;
};

export default function GroupSettings({ open, conversationId, meId, onClose, onUpdated }: Props) {
  const [group, setGroup] = React.useState<GroupDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Found[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open || !conversationId) return;
    setLoading(true);
    setError(null);
    setQuery('');
    fetchGroup(conversationId)
      .then(setGroup)
      .catch(() => setError('Could not load this group.'))
      .finally(() => setLoading(false));
  }, [open, conversationId]);

  React.useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const id = setTimeout(() => {
      apiFetch(`/api/search-users/?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Found[]) => setResults(data))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const iAmOwner = !!group && group.owner === meId;

  const saveName = async () => {
    const name = draftName.trim();
    if (!conversationId || !name || name === group?.name) {
      setEditingName(false);
      return;
    }
    try {
      setGroup(await updateGroup(conversationId, { name }));
      setEditingName(false);
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const saveAvatar = async (file: File) => {
    if (!conversationId) return;
    try {
      setGroup(await updateGroup(conversationId, { avatar: file }));
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const kick = async (userId: number) => {
    if (!conversationId) return;
    try {
      setGroup(await removeGroupMember(conversationId, userId));
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const addMember = async (u: Found) => {
    if (!conversationId) return;
    try {
      setGroup(await addGroupMembers(conversationId, [u.user_id]));
      setQuery('');
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}>
      <DialogContent>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6}}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {group && (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={group.avatar_url ?? undefined}
                  variant="rounded"
                  sx={{ width: 88, height: 88, fontSize: 34 }}
                >
                  {(group.name || '?')[0]?.toUpperCase()}
                </Avatar>
                {iAmOwner && (
                  <IconButton
                    size="small"
                    onClick={() => fileRef.current?.click()}
                    sx={{ position: 'absolute', right: -6, bottom: -6, bgcolor: 'background.paper' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) saveAvatar(f);
                  e.target.value = '';
                }}
              />

              {editingName ? (
                <TextField
                  autoFocus
                  size="small"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="h6">{group.name}</Typography>
                  {iAmOwner && (
                    <IconButton
                      size="small"
                      onClick={() => { setDraftName(group.name); setEditingName(true); }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                {group.members.length} members
              </Typography>
            </Box>

            <List dense>
              {group.members.map((m) => (
                <ListItem
                  key={m.user_id}
                  secondaryAction={
                    iAmOwner && m.user_id !== meId ? (
                      <IconButton edge="end" size="small" onClick={() => kick(m.user_id)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={m.avatar ?? undefined} sx={{ width: 32, height: 32 }}>
                      {(m.display_name || m.tag || '?')[0]?.toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={m.display_name || m.tag}
                    secondary={m.is_owner ? 'Owner' : `@${m.tag}`}
                  />
                </ListItem>
              ))}
            </List>

            {iAmOwner && (
              <>
                <TextField
                  label="Add people"
                  placeholder="Search by @tag"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mt: 1 }}
                />
                <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {results
                    .filter((u) => !group.members.some((m) => m.user_id === u.user_id))
                    .map((u) => (
                      <ListItemButton key={u.user_id} onClick={() => addMember(u)}>
                        <ListItemAvatar>
                          <Avatar src={u.avatar ?? undefined} sx={{ width: 32, height: 32 }}>
                            {(u.display_name || u.tag)[0]?.toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={u.display_name || u.tag} secondary={`@${u.tag}`} />
                      </ListItemButton>
                    ))}
                </List>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}