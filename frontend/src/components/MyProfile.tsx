import { useAppTheme } from "../Theme";
import { WALLPAPERS, type WallpaperKey } from "../wallpapers";
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
  Stack,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import { API_BASE, apiFetch } from "../api";
import { useUserSession } from "../UserSession";

type Profile = {
  display_name: string;
  tag: string;
  bio: string;
  avatar: string | null;
};

const EMPTY: Profile = { display_name: "", tag: "", bio: "", avatar: null };

export default function MyProfile({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, logout, refreshProfile } = useUserSession();
  const { mode, pref, setPref, wallpaper, setWallpaper, randomizeWallpaper } = useAppTheme();
  const [profile, setP] = useState<Profile>(EMPTY);
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
          tag: d.tag ?? "",
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
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("display_name", profile.display_name);
      fd.append("bio", profile.bio);
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
      refreshProfile();
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
                      width: 32, height: 32, p: 0,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                }
              >
                <Avatar
                  src={preview ?? profile.avatar ?? undefined}
                  sx={{ width: 88, height: 88, fontSize: 32 }}
                >
                  {(profile.display_name || profile.tag || user?.username || "?")[0]?.toUpperCase()}
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
                @{profile.tag || user?.username}
              </Typography>
            </Box>

            <TextField
              label="Name"
              size="small"
              fullWidth
              value={profile.display_name}
              onChange={(e) => setP({ ...profile, display_name: e.target.value })}
            />
            <TextField
              label="Tag"
              size="small"
              fullWidth
              disabled
              value={profile.tag || user?.username || ""}
              helperText="Cannot be changed "
              slotProps={{ input: { startAdornment: <Box sx={{ mr: 0.5, opacity: 0.6 }}>@</Box> } }}
            />
            <TextField
              label="Bio"
              size="small"
              fullWidth
              multiline
              minRows={3}
              helperText={`${profile.bio.length}/200`}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              value={profile.bio}
              onChange={(e) => setP({ ...profile, bio: e.target.value })}
            />

            {msg && <Alert severity={msg.type === "ok" ? "success" : "error"}>{msg.text}</Alert>}

            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>

            <Divider />
            <Typography variant="subtitle2">Appearance</Typography>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Theme
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={pref}
              onChange={(_, v) => v && setPref(v)}>
              <ToggleButton value="light">Light</ToggleButton>
              <ToggleButton value="system">System</ToggleButton>
              <ToggleButton value="dark">Dark</ToggleButton>
            </ToggleButtonGroup>
          </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Chat wallpaper
              </Typography>
              <Stack direction="row" spacing={1}>
                {(Object.keys(WALLPAPERS) as WallpaperKey[]).map((key) => {
                  const src = WALLPAPERS[key][mode];
                  return (
                    <Box
                      key={key}
                      onClick={() => setWallpaper(key)}
                      title={WALLPAPERS[key].label}
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 1,
                        cursor: "pointer",
                        bgcolor: "background.default",
                        border: wallpaper === key ? "2px solid" : "1px solid",
                        borderColor: wallpaper === key ? "primary.main" : "divider",
                        backgroundImage: src ? `url(${src})` : "none",
                        backgroundSize: "90px",
                      }}
                    />
                  );
                })}
              </Stack>

              <Button
                size="small"
                variant="outlined"
                onClick={randomizeWallpaper}
                disabled={wallpaper === "none"}
                sx={{ mt: 1.5 }}
              >
                Randomize
              </Button>
            </Box>

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