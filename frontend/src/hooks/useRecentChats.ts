import * as React from 'react';
import { apiFetch } from '../api';

export type RecentContact = {
  user_id: number;
  tag: string;
  display_name?: string | null;
  avatar: string | null;
};

function load(meId: number): RecentContact[] {
  try {
    const raw = localStorage.getItem(`recentChats_${meId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(meId: number, contacts: RecentContact[]) {
  try {
    localStorage.setItem(`recentChats_${meId}`, JSON.stringify(contacts));
  } catch {
    //ignore
  }
}

export function useRecentChats(meId: number) {
  const [recentChats, setRecentChats] = React.useState<RecentContact[]>([]);

  React.useEffect(() => {
    const cached = load(meId);
    setRecentChats(cached);
    if (cached.length === 0) return;

    let cancelled = false;

    (async () => {
      const fresh = await Promise.all(
        cached.map(async (c) => {
          try {
            const res = await apiFetch(`/api/users/${c.user_id}/`);
            if (!res.ok) return c;
            const d = await res.json();
            return {
              user_id: c.user_id,
              tag: d.tag ?? c.tag,
              display_name: d.display_name ?? null,
              avatar: d.avatar ?? null,
            };
          } catch {
            return c;
          }
        }),
      );
      if (cancelled) return;
      setRecentChats(fresh);
      save(meId, fresh);
    })();

    return () => {
      cancelled = true;
    };
  }, [meId]);

const addOrBump = React.useCallback(
    (contact: RecentContact) => {
      setRecentChats((prev) => {
        const withoutDupe = prev.filter((c) => c.user_id !== contact.user_id);
        const updated = [contact, ...withoutDupe].slice(0, 20);
        save(meId, updated);
        return updated;
      });
    },
    [meId],
  );

  const remove = React.useCallback(
    (userId: number) => {
      setRecentChats((prev) => {
        const updated = prev.filter((c) => c.user_id !== userId);
        save(meId, updated);
        return updated;
      });
    },
    [meId],
  );

  return { recentChats, addOrBump, remove };
}