'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { IconArrowDown } from '@tabler/icons-react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { DateChip } from '@/components/chat/DateChip';
import { Message, PublicUser } from '@/types';
import { dayKey } from '@/lib/utils';
import { dayLabel } from '@/lib/format';
import { useDismiss } from '@/hooks/useDismiss';
import { getMessages, getOlderMessages } from '@/services/conversation.service';
import { t } from '@/i18n';

export interface MessageListHandle {
  /** Scroll to a message, fetching a window around it when not loaded. */
  jumpToMessage(messageId: string): Promise<void>;
}

interface MessageListProps {
  conversationId: string;
  messages: Message[];
  currentUsername: string;
  currentUserId: string;
  isGroup: boolean;
  participants: PublicUser[];
  memberReads: Record<string, string>;
  /** Pagination is owned by the parent — single source of truth. */
  hasMore: boolean;
  /** True when a jump left the list on a history window (gap to the tail). */
  detached: boolean;
  onExhausted: () => void;
  onPrepend: (older: Message[]) => void;
  onJumpReplace: (list: Message[]) => void;
  onReturnToLatest: () => Promise<void>;
  onSaveEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
}

/**
 * The scrollable message area: day separators + floating date chip, reverse
 * infinite scroll (anchored prepend), jump/highlight, per-message ephemeral UI
 * state, and the "jump to latest" affordance while detached.
 * Remounted per conversation by the parent's key — state starts fresh.
 */
export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  {
    conversationId,
    messages,
    currentUsername,
    currentUserId,
    isGroup,
    participants,
    memberReads,
    hasMore,
    detached,
    onExhausted,
    onPrepend,
    onJumpReplace,
    onReturnToLatest,
    onSaveEdit,
    onDelete,
    onReact,
    onReply,
  },
  ref
) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null);
  const [detailOpenId, setDetailOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Floating date chip: day of the topmost visible message, shown only while
  // scrolling (and never at the very top); its inline separator hides meanwhile.
  const [floatingDay, setFloatingDay] = useState<{ key: string; label: string } | null>(null);
  const [showFloatingDay, setShowFloatingDay] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hideChipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const skipAutoScrollRef = useRef(false);

  const otherReads = Object.entries(memberReads)
    .filter(([id]) => id !== currentUserId)
    .map(([, at]) => at);

  // One open popover at a time; outside click / Escape dismisses them all.
  const dismissAll = useCallback(() => {
    setMenuOpenId(null);
    setPickerOpenId(null);
    setDetailOpenId(null);
  }, []);
  useDismiss(menuOpenId !== null || pickerOpenId !== null || detailOpenId !== null, dismissAll);

  // Auto-scroll to the newest message unless a jump asked us not to.
  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }
    if (!highlightedId) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightedId]);

  // Track which messages are visible; the chip shows the topmost one's day.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.mid;
          if (!id) continue;
          if (entry.isIntersecting) visibleIdsRef.current.add(id);
          else visibleIdsRef.current.delete(id);
        }
        const topmost = messages.find((m) => visibleIdsRef.current.has(m._id));
        if (topmost) {
          const key = dayKey(topmost.createdAt);
          setFloatingDay((prev) =>
            prev?.key === key ? prev : { key, label: dayLabel(topmost.createdAt) }
          );
        }
      },
      { root: container }
    );

    visibleIdsRef.current.clear();
    for (const m of messages) {
      const el = messageRefs.current.get(m._id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (hideChipTimerRef.current) clearTimeout(hideChipTimerRef.current);
    };
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    setLoadingMore(true);
    try {
      const res = await getOlderMessages(conversationId, messages[0].createdAt);
      if (!res.success) return;
      if (res.data.messages.length === 0) {
        onExhausted();
        return;
      }
      skipAutoScrollRef.current = true;
      onPrepend(res.data.messages);
      // Keep the viewport anchored on the same message after the prepend.
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } finally {
      setLoadingMore(false);
    }
  }

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;
    // WhatsApp behavior: the chip is visible only WHILE scrolling (never at the
    // very top, where the first inline separator is already in view).
    const show = container.scrollTop > 60;
    setShowFloatingDay(show);
    if (hideChipTimerRef.current) clearTimeout(hideChipTimerRef.current);
    if (show) {
      hideChipTimerRef.current = setTimeout(() => setShowFloatingDay(false), 1200);
    }
    if (container.scrollTop < 80) {
      loadMore();
    }
  }

  async function jumpToMessage(messageId: string) {
    const existing = messageRefs.current.get(messageId);
    if (existing) {
      existing.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const res = await getMessages(conversationId, messageId);
      if (!res.success) return;
      skipAutoScrollRef.current = true;
      onJumpReplace(res.data.messages);
      requestAnimationFrame(() => {
        messageRefs.current.get(messageId)?.scrollIntoView({ block: 'center' });
      });
    }
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId(null), 2000);
  }

  useImperativeHandle(ref, () => ({ jumpToMessage }));

  async function saveEdit(messageId: string) {
    if (!editDraft.trim()) return;
    await onSaveEdit(messageId, editDraft.trim());
    setEditingId(null);
  }

  return (
    <div className="relative min-h-0 flex-1">
      {floatingDay && showFloatingDay && (
        <div className="pointer-events-none absolute left-0 right-0 top-2 z-20 flex justify-center">
          <DateChip label={floatingDay.label} />
        </div>
      )}

      {detached && (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center">
          <button
            onClick={() => onReturnToLatest()}
            className="flex items-center gap-1 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand-text)] shadow-lg hover:bg-[var(--brand-hover)]"
          >
            <IconArrowDown size={14} /> {t('chat.jumpToLatest')}
          </button>
        </div>
      )}

      <div ref={scrollContainerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-4 py-4">
        {loadingMore && (
          <p className="mb-2 text-center text-xs text-[var(--text-muted)]">{t('chat.loadingOlder')}</p>
        )}
        {!hasMore && messages.length > 0 && (
          <p className="mb-2 text-center text-xs text-[var(--text-muted)]">{t('chat.startOfConversation')}</p>
        )}
        {messages.map((m, i) => {
          const newDay = i === 0 || dayKey(messages[i - 1].createdAt) !== dayKey(m.createdAt);
          const myDayKey = dayKey(m.createdAt);
          return (
            <div key={m._id}>
              {newDay && (
                <div
                  className={`my-2 flex justify-center ${
                    showFloatingDay && floatingDay?.key === myDayKey ? 'invisible' : ''
                  }`}
                >
                  <DateChip label={dayLabel(m.createdAt)} />
                </div>
              )}
              <MessageBubble
                message={m}
                mine={m.sender.username === currentUsername}
                isGroup={isGroup}
                currentUserId={currentUserId}
                participants={participants}
                memberReads={memberReads}
                otherReads={otherReads}
                highlighted={highlightedId === m._id}
                menuOpen={menuOpenId === m._id}
                pickerOpen={pickerOpenId === m._id}
                detailOpen={detailOpenId === m._id}
                editing={editingId === m._id}
                editDraft={editingId === m._id ? editDraft : ''}
                innerRef={(el) => {
                  if (el) messageRefs.current.set(m._id, el);
                  else messageRefs.current.delete(m._id);
                }}
                onToggleMenu={() => {
                  setPickerOpenId(null);
                  setMenuOpenId((id) => (id === m._id ? null : m._id));
                }}
                onTogglePicker={() => {
                  setMenuOpenId(null);
                  setPickerOpenId((id) => (id === m._id ? null : m._id));
                }}
                onToggleDetail={() => {
                  setDetailOpenId((id) => (id === m._id ? null : m._id));
                  setMenuOpenId(null);
                }}
                onStartEdit={() => {
                  setMenuOpenId(null);
                  setEditingId(m._id);
                  setEditDraft(m.content);
                }}
                onCancelEdit={() => setEditingId(null)}
                onEditDraftChange={setEditDraft}
                onSaveEdit={() => saveEdit(m._id)}
                onDelete={() => {
                  setMenuOpenId(null);
                  onDelete(m._id);
                }}
                onReact={(emoji) => {
                  setPickerOpenId(null);
                  onReact(m._id, emoji);
                }}
                onReply={() => onReply(m)}
                onJump={jumpToMessage}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
});
