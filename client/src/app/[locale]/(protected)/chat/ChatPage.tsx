'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Conversation } from '@/types';
import { getConversations } from '@/services/conversation.service';
import { subscribeChatSocket } from '@/services/chatSocket.service';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/hooks/useT';

export function ChatPage() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
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
    getConversations().then((res) => {
      if (res.success) setConversations(res.data.conversations);
    });
  }, []);

  useEffect(() => {
    return subscribeChatSocket({
      getActiveConversationId: () => activeIdRef.current,
      getConversations: () => conversationsRef.current,
      currentUsername: user!.username,
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

  return (
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
            key={active._id}
            conversation={active}
            focusMessageId={focusMessageId}
            onFocused={() => setFocusMessageId(null)}
            onBack={() => setActive(null)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-()">
            <EmptyState padding="centered">{t('chat.selectConversation')}</EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
