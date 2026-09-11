import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { API_BASE, apiFetch, setNickname } from "../api";

type OtherProfile = {
  display_name: string;
  tag: string;
  bio: string;
  avatar: string | null;
  nickname: string;
};

export default function OtherProfile({
  userId,
  onClose,
  onMessage,
  onNicknameSaved,
}: {
  userId: number | null;
  onClose: () => void;
  onMessage: (u: { user_id: number; tag: string; avatar: string | null }) => void;
  /** fires after a nickname is saved/cleared, so the sidebar can refresh */
  onNicknameSaved?: () => void;
}) {
  const [profile, setProfile] = useState<OtherProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // nickname editing
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setProfile(null);
    setErr(null);
    setEditing(false);
    setLoading(true);
    apiFetch(`/api/users/${userId}/`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load profile (${r.status})`);
        return r.json();
      })
      .then((d) =>
        setProfile({
          display_name: d.display_name ?? "",
          tag: d.tag ?? "",
          bio: d.bio ?? "",
          avatar: d.avatar ? (d.avatar.startsWith("http") ? d.avatar : API_BASE + d.avatar) : null,
          nickname: d.nickname ?? "",
        })
      )
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const startEdit = () => {
    setDraft(profile?.nickname ?? "");
    setEditing(true);
  };

  const saveNickname = async () => {
    if (!userId || !profile) return;
    setSaving(true);
    setErr(null);
    try {
      const saved = await setNickname(userId, draft.trim());
      setProfile({ ...profile, nickname: saved });
      setEditing(false);
      onNicknameSaved?.();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // the real name, shown small underneath so you don't forget who this is
  const realName = profile ? profile.display_name || profile.tag : "";

  return (
    <Dialog
      open={userId !== null}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
    >
      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {profile && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <Avatar sx={{ width: 88, height: 88, fontSize: 32, bgcolor: 'primary.main', color: '#14100E' }}>
                {(profile.nickname || realName || "?")[0]?.toUpperCase()}
              </Avatar>

              {editing ? (
               <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, width: '100%' }}>
                  <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    placeholder="Nickname"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveNickname();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    disabled={saving}
                    helperText="Only you can see this. Leave empty to clear."
                    slotProps={{ htmlInput: { maxLength: 50 } }}
                  />
                  <IconButton size="small" onClick={saveNickname} disabled={saving}>
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => setEditing(false)} disabled={saving}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1, width: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {profile.nickname || realName}
                  </Typography>
                  <IconButton size="small" onClick={startEdit}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}

              {/* if a nickname is set, still show who they actually are */}
              {profile.nickname && !editing && (
                <Typography variant="body2" color="text.secondary">
                  {realName}
                </Typography>
              )}

              <Typography variant="body2" color="text.secondary">
                @{profile.tag}
              </Typography>
            </Box>

            {profile.bio && (
              <>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Bio
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {profile.bio}
                  </Typography>
                </Box>
              </>
            )}

            <Divider />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                fullWidth
                onClick={() =>
                  onMessage({ user_id: userId!, tag: profile.tag, avatar: profile.avatar })
                }
              >
                Message
              </Button>
              <Button variant="outlined" color="error" fullWidth disabled>
                Block
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}