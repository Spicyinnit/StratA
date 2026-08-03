import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { API_BASE, apiFetch } from "../api";
import { useAuth } from "../AuthContext";

type Profile = {
  display_name: string;
  handle: string;
  bio: string;
  avatar: string | null;
};

const EMPTY: Profile = { display_name: "", handle: "", bio: "", avatar: null };

export default function ProfileDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const [p, setP] = useState<Profile>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // load profile whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setFile(null);
    setPreview(null);
    setLoading(true);
    apiFetch(`/api/profile/me/`)
      .then((r) => {
        if (!r.ok) throw new Error(`GET failed (${r.status})`);
        return r.json();
      })
      .then((d) =>
        setP({
          display_name: d.display_name ?? "",
          handle: d.handle ?? "",
          bio: d.bio ?? "",
          avatar: d.avatar ? (d.avatar.startsWith("http") ? d.avatar : API_BASE + d.avatar) : null,
        })
      )
      .catch((e) => setMsg({ type: "err", text: e.message }))
      .finally(() => setLoading(false));
  }, [open]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!p.handle.trim()) {
      setMsg({ type: "err", text: "Handle can't be empty." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("display_name", p.display_name);
      fd.append("handle", p.handle);
      fd.append("bio", p.bio);
      if (file) fd.append("avatar", file);

      const r = await apiFetch(`/api/profile/me/`, {
        method: "PATCH",
        body: fd,
      });
      if (!r.ok) throw new Error(`Save failed (${r.status})`);
      const d = await r.json();
      setP((prev) => ({
        ...prev,
        avatar: d.avatar ? (d.avatar.startsWith("http") ? d.avatar : API_BASE + d.avatar) : prev.avatar,
      }));
      setFile(null);
      setMsg({ type: "ok", text: "Profile saved." });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
    >
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* avatar */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={
                  <IconButton
                    size="small"
                    onClick={() => fileRef.current?.click()}
                    sx={{
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    ✎
                  </IconButton>
                }
              >
                <Avatar
                  src={preview ?? p.avatar ?? undefined}
                  sx={{ width: 88, height: 88, fontSize: 32 }}
                >
                  {(p.display_name || p.handle || user?.username || "?")[0]?.toUpperCase()}
                </Avatar>
              </Badge>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <Typography variant="body2" color="text.secondary">
                @{p.handle || user?.username}
              </Typography>
            </Box>

            <TextField
              label="Name"
              size="small"
              fullWidth
              value={p.display_name}
              onChange={(e) => setP({ ...p, display_name: e.target.value })}
            />
            <TextField
              label="Handle"
              size="small"
              fullWidth
              value={p.handle}
              onChange={(e) => setP({ ...p, handle: e.target.value.replace(/\s/g, "") })}
              slotProps={{ input: { startAdornment: <Box sx={{ mr: 0.5, opacity: 0.6 }}>@</Box> } }}
            />
            <TextField
              label="Bio"
              size="small"
              fullWidth
              multiline
              minRows={3}
              helperText={`${p.bio.length}/200`}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              value={p.bio}
              onChange={(e) => setP({ ...p, bio: e.target.value })}
            />

            {msg && <Alert severity={msg.type === "ok" ? "success" : "error"}>{msg.text}</Alert>}

            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>

            <Divider />

            <Button color="error" onClick={logout}>
              Log out
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}