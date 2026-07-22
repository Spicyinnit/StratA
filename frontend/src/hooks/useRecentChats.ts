import * as React from 'react';

export type RecentContact = { user_id: number; handle: string; avatar: string | null };

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
    // ignore
  }
}

export function useRecentChats(meId: number) {
  const [recentChats, setRecentChats] = React.useState<RecentContact[]>([]);

  React.useEffect(() => {
    setRecentChats(load(meId));
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

  return { recentChats, addOrBump };
}