'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { searchMessages } from '@/services/conversation.service';
import { openSearchResult, selectConversation } from '@/services/chat.service';
import { useDraftStore } from '@/stores/draft.store';
import { useChatStore } from '@/stores/chat.store';
import type { PublicUser } from '@/types';
import { conversationName, fullName, otherParticipant } from '@/lib/utils';
import { useT } from '@/hooks/useT';
import { SearchField } from '@/components/ui/SearchField';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowButton } from '@/components/ui/ListRowButton';
import type { MessageSearchResult } from '@/types';
import { useAuthStore } from '@/stores/auth.store';

export function ChatsPanel({
  isUserOnline,
}: {
  isUserOnline: (user: PublicUser) => boolean;
}) {
  const { t } = useT();
  const currentUsername = useAuthStore((s) => s.user?.username || '');
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const drafts = useDraftStore((s) => s.drafts);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setSearching(true);
      const res = await searchMessages(q);
      if (cancelled) return;
      if (res.success) setResults(res.data.messages);
      setSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  const shownResults = query.trim() ? results : [];

  function snippet(m: MessageSearchResult): string {
    if (m.attachment) return `📎 ${m.attachment.fileName}`;
    return m.content;
  }

  function resultConversationName(m: MessageSearchResult): string {
    const convo = conversations.find((c) => c._id === m.conversation._id);
    if (convo) return conversationName(convo, currentUsername);
    return m.conversation.name || fullName(m.sender);
  }

  function lastMessagePreview(c: (typeof conversations)[number]): string {
    if (!c.lastMessage) return t('sidebar.noMessagesYet');
    if (c.lastMessage.attachment) return `📎 ${c.lastMessage.attachment.fileName}`;
    return c.lastMessage.content;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <SearchField
        variant="bordered"
        className="py-1"
        value={query}
        onChange={setQuery}
        placeholder={t('sidebar.searchMessages')}
      />

      {query.trim() ? (
        <div>
          {searching && <EmptyState>{t('sidebar.searching')}</EmptyState>}
          {!searching && shownResults.length === 0 && (
            <EmptyState>{t('sidebar.noMessagesFound')}</EmptyState>
          )}
          {shownResults.map((m) => (
            <ListRowButton
              key={m._id}
              align="start"
              onClick={() => openSearchResult(m.conversation._id, m._id)}
            >
              <Avatar name={resultConversationName(m)} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-(--text-normal)">
                    {resultConversationName(m)}
                  </p>
                  <span className="shrink-0 text-[10px] text-(--text-muted)">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="truncate text-xs text-(--text-muted)">
                  {m.sender.username === currentUsername ? t('sidebar.you') : `${m.sender.firstName}: `}
                  {snippet(m)}
                </p>
              </div>
            </ListRowButton>
          ))}
        </div>
      ) : (
        <>
          {conversations.length === 0 && <EmptyState>{t('sidebar.noConversations')}</EmptyState>}
          {conversations.map((c) => {
            const other = !c.isGroup ? otherParticipant(c, currentUsername) : undefined;
            const draft = c._id !== activeId ? drafts[c._id]?.trim() : undefined;
            return (
              <ListRowButton
                key={c._id}
                active={activeId === c._id}
                onClick={() => selectConversation(c)}
              >
                <Avatar
                  name={conversationName(c, currentUsername)}
                  isOnline={!c.isGroup && !!other && isUserOnline(other)}
                  user={other}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--text-normal)">
                    {conversationName(c, currentUsername)}
                  </p>
                  <p className="truncate text-xs text-(--text-muted)">
                    {draft ? (
                      <>
                        <span className="font-medium text-(--brand)">{t('sidebar.draft')}</span> {draft}
                      </>
                    ) : (
                      lastMessagePreview(c)
                    )}
                  </p>
                </div>
                {!!c.unreadCount && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-(--brand) px-1.5 text-xs font-medium text-(--brand-text)">
                    {c.unreadCount}
                  </span>
                )}
              </ListRowButton>
            );
          })}
        </>
      )}
    </div>
  );
}
