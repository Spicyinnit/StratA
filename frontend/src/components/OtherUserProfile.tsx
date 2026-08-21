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
  Stack,
  Typography,
} from "@mui/material";
import { API_BASE, apiFetch } from "../api";

type OtherProfile = {
  display_name: string;
  tag: string;
  bio: string;
  avatar: string | null;
};

export default function OtherUserProfile({
  userId,
  onClose,
  onMessage,
}: {
  userId: number | null;
  onClose: () => void;
  onMessage: (u: { user_id: number; tag: string; avatar: string | null }) => void;
}) {
  const [profile, setProfile] = useState<OtherProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setProfile(null);
    setErr(null);
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
        })
      )
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

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

        {err && <Alert severity="error">{err}</Alert>}

        {profile && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <Avatar src={profile.avatar ?? undefined} sx={{ width: 88, height: 88, fontSize: 32 }}>
                {(profile.display_name || profile.tag || "?")[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {profile.display_name || profile.tag}
              </Typography>
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