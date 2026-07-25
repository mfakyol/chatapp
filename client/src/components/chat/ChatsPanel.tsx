'use client';

import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { Conversation, MessageSearchResult, PublicUser } from '@/types';
import { searchMessages } from '@/services/conversation.service';
import { useDraftStore } from '@/stores/draft.store';
import { conversationName, fullName, otherParticipant } from '@/lib/utils';
import { t } from '@/i18n';

/** Chats tab: global message search + the conversation list. */
export function ChatsPanel({
  conversations,
  activeConversationId,
  currentUsername,
  isUserOnline,
  onSelect,
  onOpenSearchResult,
}: {
  conversations: Conversation[];
  activeConversationId: string | null;
  currentUsername: string;
  isUserOnline: (user: PublicUser) => boolean;
  onSelect: (conversation: Conversation) => void;
  onOpenSearchResult: (conversationId: string, messageId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  // Parked composer drafts (written when a chat is switched away from). The
  // open chat's live draft lives in its Composer, so it's not shown here.
  const drafts = useDraftStore((s) => s.drafts);

  // Debounced search; the cancelled flag prevents an older response from
  // clobbering a newer query's results (out-of-order race).
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
    // Resolve the display name from our own conversation list (the search
    // payload carries only the conversation id/name/type, not its members).
    const convo = conversations.find((c) => c._id === m.conversation._id);
    if (convo) return conversationName(convo, currentUsername);
    return m.conversation.name || fullName(m.sender);
  }

  function lastMessagePreview(c: Conversation): string {
    if (!c.lastMessage) return t('sidebar.noMessagesYet');
    if (c.lastMessage.attachment) return `📎 ${c.lastMessage.attachment.fileName}`;
    return c.lastMessage.content;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <IconSearch size={16} className="text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('sidebar.searchMessages')}
          className="w-full bg-transparent py-1 text-sm text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none"
        />
      </div>

      {query.trim() ? (
        <div>
          {searching && <p className="p-4 text-sm text-[var(--text-muted)]">{t('sidebar.searching')}</p>}
          {!searching && shownResults.length === 0 && (
            <p className="p-4 text-sm text-[var(--text-muted)]">{t('sidebar.noMessagesFound')}</p>
          )}
          {shownResults.map((m) => (
            <button
              key={m._id}
              onClick={() => onOpenSearchResult(m.conversation._id, m._id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)]"
            >
              <Avatar name={resultConversationName(m)} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-[var(--text-normal)]">
                    {resultConversationName(m)}
                  </p>
                  <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {m.sender.username === currentUsername ? t('sidebar.you') : `${m.sender.firstName}: `}
                  {snippet(m)}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-[var(--text-muted)]">{t('sidebar.noConversations')}</p>
          )}
          {conversations.map((c) => {
            const other = !c.isGroup ? otherParticipant(c, currentUsername) : undefined;
            const draft = c._id !== activeConversationId ? drafts[c._id]?.trim() : undefined;
            return (
              <button
                key={c._id}
                onClick={() => onSelect(c)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] ${
                  activeConversationId === c._id ? 'bg-[var(--bg-elevated)]' : ''
                }`}
              >
                <Avatar
                  name={conversationName(c, currentUsername)}
                  isOnline={!c.isGroup && !!other && isUserOnline(other)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-normal)]">
                    {conversationName(c, currentUsername)}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {draft ? (
                      <>
                        <span className="font-medium text-[var(--brand)]">{t('sidebar.draft')}</span>{' '}
                        {draft}
                      </>
                    ) : (
                      lastMessagePreview(c)
                    )}
                  </p>
                </div>
                {!!c.unreadCount && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand)] px-1.5 text-xs font-medium text-[var(--brand-text)]">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
