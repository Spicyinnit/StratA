import * as React from 'react';
import { fetchConversations, markConversationRead, type ConversationSummary } from '../api';

// NEW — the sidebar's unit is a conversation now, not a contact.
// Groups have no user_id, so nothing can be keyed on that anymore.
export type RecentChat = ConversationSummary;

export function useRecentChats(activeConversationId: number | null) {
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

    // the chat you're looking at is read by definition
    const active = activeRef.current;
    if (active) {
      const open = items.find((c) => c.id === active);
      if (open && open.unread_count > 0) {
        markConversationRead(active).catch(() => {});
        open.unread_count = 0;
      }
    }

    setRecentChats(items);
  }, []);

  // poll — coach's call, keeping it
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

  const remove = React.useCallback((conversationId: number) => {
    setRecentChats((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  return { recentChats, refresh, markRead, remove };
}