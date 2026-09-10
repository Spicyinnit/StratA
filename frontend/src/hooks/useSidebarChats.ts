import * as React from 'react';
import { fetchConversations, markConversationRead, setConversationState, type ConversationSummary } from '../api';

export type RecentChat = ConversationSummary;
export function useSidebarChats(activeConversationId: number | null) {
  const [recentChats, setRecentChats] = React.useState<RecentChat[]>([]);

  const activeRef = React.useRef(activeConversationId);
  activeRef.current = activeConversationId;

  const refresh = React.useCallback(async () => {
    let items: ConversationSummary[];
    try {
      items = await fetchConversations();
    } catch {
      return;
    }

    const active = activeRef.current;
    if (active) {
      const open = items.find((c) => c.id === active);
      if (open && open.unread_count > 0) {
        markConversationRead(active).catch(() => {});
        open.unread_count = 0;
      }
    }
    items.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    setRecentChats(items);
  }, []);

  // poll
  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const markRead = React.useCallback(async (conversationId: number) => {
    setRecentChats((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
    );
    try {
      await markConversationRead(conversationId);
    } catch {
      // ignore
    }
  }, []);

  const setFlag = React.useCallback(
    async (conversationId: number, flag: 'pinned' | 'muted' | 'archived', value: boolean) => {
      setRecentChats((prev) =>
        prev
          .map((c) => (c.id === conversationId ? { ...c, [flag]: value } : c))
          .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
      );
      try {
        await setConversationState(conversationId, { [flag]: value });
      } catch {
        refresh();  // server said no — snap back to truth
      }
    },
    [refresh],
  );

  const remove = React.useCallback((conversationId: number) => {
    setRecentChats((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  return { recentChats, refresh, markRead, remove, setFlag };
}