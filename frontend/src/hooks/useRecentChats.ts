import * as React from 'react';
import { apiFetch, markConversationRead } from '../api';

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

export function useRecentChats(meId: number, activeOtherId: number | null) {
  const [recentChats, setRecentChats] = React.useState<RecentContact[]>([]);
  const [unreadCounts, setUnreadCounts] = React.useState<Record<number, number>>({});

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

  const addIfMissing = React.useCallback(
    (contact: RecentContact) => {
      setRecentChats((prev) => {
        if (prev.some((c) => c.user_id === contact.user_id)) return prev;
        const updated = [contact, ...prev].slice(0, 20);
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
      setUnreadCounts((prev) => {
        if (!prev[userId]) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    },
    [meId],
  );

  const activeRef = React.useRef(activeOtherId);
  activeRef.current = activeOtherId;

  const markRead = React.useCallback(async (userId: number) => {
    setUnreadCounts((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    try {
      await markConversationRead(userId);
    } catch {
      // ignore
    }
  }, []);

  // poll unread- keep contact badge counts, pull unknown senders into the sidebar
  React.useEffect(() => {
    const tick = async () => {
      let items: any[];
      try {
        const res = await apiFetch('/api/conversations/unread-summary/');
        if (!res.ok) return;
        items = await res.json();
      } catch {
        return;
      }

      const counts: Record<number, number> = {};

      for (const it of items) {
        addIfMissing({
          user_id: it.user_id,
          tag: it.tag,
          display_name: it.display_name,
          avatar: it.avatar,
        });
        if (it.user_id === activeRef.current) {
          markConversationRead(it.user_id).catch(() => {});
          continue;
        }
        counts[it.user_id] = it.unread_count;
      }

      setUnreadCounts(counts);
    };

    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [addIfMissing]);

  return { recentChats, addOrBump, addIfMissing, remove, unreadCounts, markRead };
}