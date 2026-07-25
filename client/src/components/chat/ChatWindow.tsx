'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ProfilePanel } from '@/components/chat/ProfilePanel';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatSearchBar } from '@/components/chat/ChatSearchBar';
import { MessageList, MessageListHandle } from '@/components/chat/MessageList';
import { MessageSkeleton } from '@/components/chat/MessageSkeleton';
import { Composer } from '@/components/chat/Composer';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Conversation, Message, MessageSearchResult } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { usePresenceMap } from '@/hooks/usePresence';
import { connectSocket } from '@/lib/socket';
import {
  getMessages,
  sendMessage,
  markRead,
  reactToMessage,
  searchMessages,
  editMessage,
  deleteMessage,
} from '@/services/conversation.service';
import { conversationName, otherParticipant, formatLastSeen, userId } from '@/lib/utils';
import { upsertMessage, markDeleted, replaceMessage, setReactions } from '@/lib/messageListOps';
import { t } from '@/i18n';

const PAGE_SIZE = 50;

/**
 * Orchestrator for one open conversation. Mounted with `key={conversation._id}`
 * by the page, so all state here is per-conversation by construction — there is
 * no reset-on-switch logic anywhere.
 */
export function ChatWindow({
  conversation,
  focusMessageId,
  onFocused,
  onBack,
}: {
  conversation: Conversation;
  focusMessageId?: string | null;
  onFocused?: () => void;
  onBack?: () => void;
}) {
  const { user } = useAuth();
  const presence = usePresenceMap();
  const { confirm, confirmDialog } = useConfirm();
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  // After a jump-to-old-message the list shows a window around the target and
  // is "detached" from the live tail: incoming messages are NOT appended (they
  // would sit next to a gap). The list shows a "jump to latest" affordance.
  const [detached, setDetached] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  // Live read-pointer updates layered over the snapshot from the conversation
  // payload; the merged map is derived, so no state-sync effect is needed.
  const [readOverrides, setReadOverrides] = useState<Record<string, string>>({});
  const listRef = useRef<MessageListHandle>(null);
  const detachedRef = useRef(false);
  useEffect(() => {
    detachedRef.current = detached;
  }, [detached]);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReadRef = useRef(false);

  const currentUserId = userId(user);
  const currentUsername = user?.username || '';

  /**
   * Debounced, visibility-aware read-marking. Debounce: in an active group
   * every incoming message would otherwise trigger a POST + a broadcast to
   * every member (O(n²) chatter). Visibility: a hidden tab must NOT send read
   * receipts — the user hasn't seen anything; the pending mark is flushed when
   * the tab becomes visible again.
   */
  function scheduleMarkRead() {
    if (typeof document !== 'undefined' && document.hidden) {
      pendingReadRef.current = true;
      return;
    }
    if (markReadTimerRef.current) return;
    markReadTimerRef.current = setTimeout(() => {
      markReadTimerRef.current = null;
      markRead(conversation._id);
    }, 500);
  }

  const memberReads = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of conversation.members ?? []) {
      const id = userId(m.user);
      if (id) map[id] = m.lastReadAt;
    }
    return { ...map, ...readOverrides };
  }, [conversation.members, readOverrides]);

  const other = !conversation.isGroup ? otherParticipant(conversation, currentUsername) : undefined;
  const otherLive = other ? presence[userId(other)] : undefined;
  const otherIsOnline = otherLive?.isOnline ?? other?.isOnline ?? false;
  const otherLastSeen = otherLive?.lastSeen ?? other?.lastSeen;

  const typingNames = Array.from(typingUsers)
    .map((id) => conversation.participants.find((p) => userId(p) === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => p.firstName);
  const typingLabel =
    typingNames.length === 0
      ? ''
      : !conversation.isGroup
        ? t('chat.typing')
        : typingNames.length === 1
          ? t('chat.typingOne', { name: typingNames[0] })
          : t('chat.typingMany', { names: typingNames.join(', ') });
  const headerSubtitle =
    typingLabel ||
    (conversation.isGroup ? '' : otherIsOnline ? t('chat.online') : formatLastSeen(otherLastSeen));

  /** Fetch the newest page and re-attach to the live tail. */
  async function returnToLatest(): Promise<void> {
    const res = await getMessages(conversation._id);
    if (!res.success) return;
    setMessages(res.data.messages);
    setHasMore(res.data.messages.length >= PAGE_SIZE);
    setDetached(false);
  }

  // Initial load + socket wiring. Aborts the in-flight fetch on unmount, which
  // also silences StrictMode's duplicate dev request.
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const typingTimers = typingTimeoutsRef.current;

    getMessages(conversation._id, undefined, { signal: abort.signal }).then((res) => {
      if (!active) return;
      setInitialLoading(false);
      if (!res.success) return;
      setMessages(res.data.messages);
      if (res.data.messages.length < PAGE_SIZE) setHasMore(false);
    });
    scheduleMarkRead();

    // Idempotent: never silently no-op because the socket wasn't created yet.
    const socket = connectSocket();
    // If the socket is still connecting at mount, its FIRST 'connect' is not a
    // reconnect — the initial fetch above already covers it.
    let everConnected = socket.connected;

    // Flush a read-mark that was deferred while the tab was hidden.
    function handleVisibility() {
      if (!document.hidden && pendingReadRef.current) {
        pendingReadRef.current = false;
        scheduleMarkRead();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    function handleNewMessage({ message }: { message: Message }) {
      if (message.conversation !== conversation._id) return;
      // Detached from the tail (viewing history): don't append next to a gap.
      if (!detachedRef.current) {
        setMessages((prev) => upsertMessage(prev, message));
      }
      if (message.sender.username !== currentUsername) {
        scheduleMarkRead();
      }
    }

    function handleEdited({ message }: { message: Message }) {
      if (message.conversation !== conversation._id) return;
      setMessages((prev) => replaceMessage(prev, message._id, message));
    }

    function handleDeleted({ conversationId, messageId }: { conversationId: string; messageId: string }) {
      if (conversationId !== conversation._id) return;
      setMessages((prev) => markDeleted(prev, messageId));
    }

    function handleConversationRead({
      conversationId,
      userId: readerId,
      lastReadAt,
    }: {
      conversationId: string;
      userId: string;
      lastReadAt: string;
    }) {
      if (conversationId !== conversation._id) return;
      setReadOverrides((prev) => ({ ...prev, [readerId]: lastReadAt }));
    }

    function handleReaction({
      conversationId,
      messageId,
      reactions,
    }: {
      conversationId: string;
      messageId: string;
      reactions: Message['reactions'];
    }) {
      if (conversationId !== conversation._id) return;
      setMessages((prev) => setReactions(prev, messageId, reactions));
    }

    function clearTypingTimeout(id: string) {
      const existing = typingTimeoutsRef.current.get(id);
      if (existing) clearTimeout(existing);
      typingTimeoutsRef.current.delete(id);
    }

    function handleTypingStart({ conversationId, userId: typerId }: { conversationId: string; userId: string }) {
      if (conversationId !== conversation._id) return;
      setTypingUsers((prev) => new Set(prev).add(typerId));
      clearTypingTimeout(typerId);
      typingTimeoutsRef.current.set(
        typerId,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(typerId);
            return next;
          });
        }, 3000)
      );
    }

    function handleTypingStop({ conversationId, userId: typerId }: { conversationId: string; userId: string }) {
      if (conversationId !== conversation._id) return;
      clearTypingTimeout(typerId);
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(typerId);
        return next;
      });
    }

    // Reconnect resync: refetch the thread so nothing broadcast during the
    // disconnect gap stays missing.
    function handleReconnect() {
      if (!everConnected) {
        everConnected = true;
        return;
      }
      getMessages(conversation._id).then((res) => {
        if (!active || !res.success) return;
        setMessages(res.data.messages);
        setHasMore(res.data.messages.length >= PAGE_SIZE);
        setDetached(false);
      });
      scheduleMarkRead();
    }

    socket.on('connect', handleReconnect);
    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleEdited);
    socket.on('message:deleted', handleDeleted);
    socket.on('conversation:read', handleConversationRead);
    socket.on('message:reaction', handleReaction);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    return () => {
      active = false;
      abort.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
      socket.off('connect', handleReconnect);
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleEdited);
      socket.off('message:deleted', handleDeleted);
      socket.off('conversation:read', handleConversationRead);
      socket.off('message:reaction', handleReaction);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      typingTimers.forEach((timer) => clearTimeout(timer));
      typingTimers.clear();
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current);
        markReadTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation._id]);

  // Sidebar search result → jump into the thread. Waits out the skeleton:
  // while initialLoading the list isn't mounted, so listRef is still null.
  useEffect(() => {
    if (initialLoading || !focusMessageId) return;
    listRef.current?.jumpToMessage(focusMessageId).then(() => onFocused?.());
  }, [focusMessageId, onFocused, initialLoading]);

  // Debounced in-conversation search. The cancelled flag prevents an older
  // response from clobbering a newer query's results (out-of-order race).
  useEffect(() => {
    const q = searchQuery.trim();
    if (!showSearch || !q) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const res = await searchMessages(q, conversation._id);
      if (cancelled) return;
      if (res.success) setSearchResults(res.data.messages);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery, showSearch, conversation._id]);
  const shownSearchResults = showSearch && searchQuery.trim() ? searchResults : [];

  /** Optimistic send; returns false so the composer can restore the draft. */
  async function handleSend(content: string, replyToId?: string): Promise<boolean> {
    // First send is a user gesture — the right moment to ask for notification
    // permission (prompting on page load gets muted by modern browsers).
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Sending while detached first re-attaches to the tail (WhatsApp behavior).
    if (detachedRef.current) await returnToLatest();

    const tempId = `tmp-${crypto.randomUUID()}`;
    const temp: Message = {
      _id: tempId,
      clientTempId: tempId,
      conversation: conversation._id,
      sender: {
        id: currentUserId,
        _id: currentUserId,
        username: currentUsername,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
      },
      content,
      reactions: [],
      replyTo: replyingTo ?? undefined,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, temp]);
    setReplyingTo(null);

    const res = await sendMessage(conversation._id, {
      content,
      replyTo: replyToId,
      clientTempId: tempId,
    });
    if (!res.success) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      return false;
    }
    setMessages((prev) => upsertMessage(prev, res.data.message));
    return true;
  }

  async function handleSaveEdit(messageId: string, content: string) {
    const res = await editMessage(conversation._id, messageId, content);
    if (res.success) {
      setMessages((prev) => replaceMessage(prev, messageId, res.data.message));
    }
  }

  async function handleDelete(messageId: string) {
    if (!(await confirm(t('chat.confirmDelete')))) return;
    const res = await deleteMessage(conversation._id, messageId);
    if (!res.success) return;
    setMessages((prev) => markDeleted(prev, messageId));
  }

  function handleReact(messageId: string, emoji: string) {
    // Fire-and-forget: the server broadcasts message:reaction back to us too.
    reactToMessage(conversation._id, messageId, emoji);
  }

  /** Around-fetch replace coming from a jump: possibly detaches from the tail. */
  function handleJumpReplace(list: Message[]) {
    const latestKnownId = messages[messages.length - 1]?._id;
    setMessages(list);
    setHasMore(true);
    // If the fetched window still contains what we knew as the latest message,
    // we are not actually detached from the tail.
    setDetached(!latestKnownId || !list.some((m) => m._id === latestKnownId));
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex h-full min-h-0 flex-1 flex-col bg-[var(--bg-chat)]">
        <ChatHeader
          title={conversationName(conversation, currentUsername)}
          subtitle={headerSubtitle}
          isOnline={!conversation.isGroup && otherIsOnline}
          onBack={onBack}
          onOpenProfile={() => setShowProfile(true)}
          onToggleSearch={() => setShowSearch((v) => !v)}
        />

        {showSearch && (
          <ChatSearchBar
            query={searchQuery}
            results={shownSearchResults}
            onQueryChange={setSearchQuery}
            onClose={() => setShowSearch(false)}
            onPick={(id) => listRef.current?.jumpToMessage(id)}
          />
        )}

        {initialLoading ? (
          <MessageSkeleton />
        ) : (
          <MessageList
            ref={listRef}
            conversationId={conversation._id}
            messages={messages}
            currentUsername={currentUsername}
            currentUserId={currentUserId}
            isGroup={conversation.isGroup}
            participants={conversation.participants}
            memberReads={memberReads}
            hasMore={hasMore}
            detached={detached}
            onExhausted={() => setHasMore(false)}
            onPrepend={(older) => setMessages((prev) => [...older, ...prev])}
            onJumpReplace={handleJumpReplace}
            onReturnToLatest={returnToLatest}
            onSaveEdit={handleSaveEdit}
            onDelete={handleDelete}
            onReact={handleReact}
            onReply={setReplyingTo}
          />
        )}

        <Composer
          conversationId={conversation._id}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSend={handleSend}
        />
      </div>

      {showProfile && (
        <ProfilePanel
          conversation={conversation}
          currentUsername={currentUsername}
          onClose={() => setShowProfile(false)}
        />
      )}

      {confirmDialog}
    </div>
  );
}
