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
import { useAuthStore } from '@/stores/auth.store';
import { usePresenceMap } from '@/hooks/usePresence';
import { subscribeConversationWindowSocket } from '@/services/conversationWindowSocket.service';
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
import { useT } from '@/hooks/useT';

const PAGE_SIZE = 50;


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
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const presence = usePresenceMap();
  const { confirm, confirmDialog } = useConfirm();
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  
  
  const [detached, setDetached] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  
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

  
  async function returnToLatest(): Promise<void> {
    const res = await getMessages(conversation._id);
    if (!res.success) return;
    setMessages(res.data.messages);
    setHasMore(res.data.messages.length >= PAGE_SIZE);
    setDetached(false);
  }

  
  
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

    function clearTypingTimeout(id: string) {
      const existing = typingTimeoutsRef.current.get(id);
      if (existing) clearTimeout(existing);
      typingTimeoutsRef.current.delete(id);
    }

    function handleVisibility() {
      if (!document.hidden && pendingReadRef.current) {
        pendingReadRef.current = false;
        scheduleMarkRead();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubscribeSocket = subscribeConversationWindowSocket(conversation._id, {
      onReconnect: () => {
        getMessages(conversation._id).then((res) => {
          if (!active || !res.success) return;
          setMessages(res.data.messages);
          setHasMore(res.data.messages.length >= PAGE_SIZE);
          setDetached(false);
        });
        scheduleMarkRead();
      },
      onNewMessage: (message) => {
        if (!detachedRef.current) {
          setMessages((prev) => upsertMessage(prev, message));
        }
        if (message.sender.username !== currentUsername) {
          scheduleMarkRead();
        }
      },
      onEdited: (message) => {
        setMessages((prev) => replaceMessage(prev, message._id, message));
      },
      onDeleted: (messageId) => {
        setMessages((prev) => markDeleted(prev, messageId));
      },
      onConversationRead: (readerId, lastReadAt) => {
        setReadOverrides((prev) => ({ ...prev, [readerId]: lastReadAt }));
      },
      onReaction: (messageId, reactions) => {
        setMessages((prev) => setReactions(prev, messageId, reactions));
      },
      onTypingStart: (typerId) => {
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
      },
      onTypingStop: (typerId) => {
        clearTypingTimeout(typerId);
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(typerId);
          return next;
        });
      },
    });

    return () => {
      active = false;
      abort.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribeSocket();
      typingTimers.forEach((timer) => clearTimeout(timer));
      typingTimers.clear();
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current);
        markReadTimerRef.current = null;
      }
    };
    
  }, [conversation._id]);

  
  
  useEffect(() => {
    if (initialLoading || !focusMessageId) return;
    listRef.current?.jumpToMessage(focusMessageId).then(() => onFocused?.());
  }, [focusMessageId, onFocused, initialLoading]);

  
  
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

  
  async function handleSend(content: string, replyToId?: string): Promise<boolean> {
    
    
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    
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
    
    reactToMessage(conversation._id, messageId, emoji);
  }

  
  function handleJumpReplace(list: Message[]) {
    const latestKnownId = messages[messages.length - 1]?._id;
    setMessages(list);
    setHasMore(true);
    
    
    setDetached(!latestKnownId || !list.some((m) => m._id === latestKnownId));
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex h-full min-h-0 flex-1 flex-col bg-(--bg-chat)">
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
