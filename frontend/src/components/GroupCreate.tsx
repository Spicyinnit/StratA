import * as React from 'react';
import {
  Avatar, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, TextField, List, ListItemButton, ListItemAvatar, ListItemText,
} from '@mui/material';
import { apiFetch, createGroup, type GroupDetail } from '../api';

type Found = { user_id: number; tag: string; display_name: string; avatar: string | null };

type Props = {
  open: boolean;
  meId: number;
  onClose: () => void;
  onCreated: (group: GroupDetail) => void;
};

export default function GroupCreate({ open, meId, onClose, onCreated }: Props) {
  const [name, setName] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Found[]>([]);
  const [picked, setPicked] = React.useState<Found[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // wipe the form every time the dialog opens
  React.useEffect(() => {
    if (!open) return;
    setName('');
    setQuery('');
    setResults([]);
    setPicked([]);
    setError(null);
  }, [open]);

  // debounced user search — same endpoint SearchBar uses
  React.useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      apiFetch(`/api/search-users/?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Found[]) => setResults(data.filter((u) => u.user_id !== meId)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query, meId]);

  const toggle = (u: Found) => {
    setPicked((prev) =>
      prev.some((p) => p.user_id === u.user_id)
        ? prev.filter((p) => p.user_id !== u.user_id)
        : [...prev, u],
    );
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const group = await createGroup(name.trim(), picked.map((p) => p.user_id));
      onCreated(group);
    } catch (err: any) {
      setError(err.message ?? 'Could not create group');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = name.trim().length > 0 && picked.length > 0 && !busy;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New group</DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          sx={{ mt: 1 }}
          autoFocus
          label="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
        slotProps={{ htmlInput: { maxLength: 80 } }}
        />

        {picked.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {picked.map((p) => (
              <Chip
                key={p.user_id}
                label={p.display_name || p.tag}
                onDelete={() => toggle(p)}
                size="small"
              />
            ))}
          </div>
        )}

        <TextField
          label="Add people"
          placeholder="Search by @tag"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          size="small"
        />

        <List dense sx={{ maxHeight: 220, overflowY: 'auto' }}>
          {results.map((u) => {
            const isPicked = picked.some((p) => p.user_id === u.user_id);
            return (
              <ListItemButton key={u.user_id} selected={isPicked} onClick={() => toggle(u)}>
                <ListItemAvatar>
                  <Avatar src={u.avatar ?? undefined} sx={{ width: 32, height: 32 }}>
                    {(u.display_name || u.tag)[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={u.display_name || u.tag} secondary={`@${u.tag}`} />
              </ListItemButton>
            );
          })}
        </List>

        {error && <span style={{ color: '#d32f2f', fontSize: 13 }}>{error}</span>}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit} variant="contained">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}