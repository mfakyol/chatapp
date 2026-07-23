'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PresenceListener from '@/components/PresenceListener';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Conversation } from '@/types';
import { getConversations } from '@/services/conversation.service';
import { subscribeChatSocket } from '@/services/chatSocket.service';
import { t } from '@/i18n';

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => {
    activeIdRef.current = active?._id || null;
  }, [active]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      getConversations().then((res) => {
        if (res.success) setConversations(res.data.conversations);
      });
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!user) return;

    return subscribeChatSocket({
      getActiveConversationId: () => activeIdRef.current,
      getConversations: () => conversationsRef.current,
      currentUsername: user.username,
      setConversations,
      setActive,
    });
  }, [user]);

  function handleConversationCreated(conversation: Conversation) {
    setConversations((prev) => {
      const exists = prev.find((c) => c._id === conversation._id);
      return exists ? prev : [conversation, ...prev];
    });
    setActive(conversation);
  }

  function handleSelectConversation(conversation: Conversation) {
    setActive(conversation);
    setConversations((prev) => prev.map((c) => (c._id === conversation._id ? { ...c, unreadCount: 0 } : c)));
  }

  function handleOpenSearchResult(conversationId: string, messageId: string) {
    const conversation = conversations.find((c) => c._id === conversationId);
    if (!conversation) return;
    handleSelectConversation(conversation);
    setFocusMessageId(messageId);
  }

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <PresenceListener />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeConversationId={active?._id || null}
          onSelectConversation={handleSelectConversation}
          onConversationCreated={handleConversationCreated}
          onOpenSearchResult={handleOpenSearchResult}
          hidden={!!active}
        />
        <div className={`${active ? 'flex' : 'hidden md:flex'} min-h-0 flex-1`}>
          {active ? (
            <ChatWindow
              // Remount per conversation: every piece of per-conversation state
              // starts fresh, killing the whole reset-in-effect class.
              key={active._id}
              conversation={active}
              focusMessageId={focusMessageId}
              onFocused={() => setFocusMessageId(null)}
              onBack={() => setActive(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[var(--bg-chat)]">
              <p className="text-[var(--text-muted)]">{t('chat.selectConversation')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
