'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PresenceListener from '@/components/PresenceListener';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Conversation, Message } from '@/types';
import { getConversations } from '@/services/conversation.service';
import { getSocket } from '@/lib/socket';
import { fullName, playNotificationSound } from '@/lib/utils';
import { t } from '@/i18n';

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = active?._id || null;
  }, [active]);

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
    const socket = getSocket();
    if (!socket) return;

    function handleNewMessage({ message }: { message: Message }) {
      const isActive = message.conversation === activeIdRef.current;
      const fromSelf = message.sender.username === user?.username;

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === message.conversation);
        if (!exists) {
          getConversations().then((res) => {
            if (res.success) setConversations(res.data.conversations);
          });
          return prev;
        }

        const updated = prev.map((c) =>
          c._id === message.conversation
            ? {
                ...c,
                lastMessage: message,
                unreadCount: isActive ? 0 : (c.unreadCount || 0) + (fromSelf ? 0 : 1),
              }
            : c
        );
        const target = updated.find((c) => c._id === message.conversation)!;
        return [target, ...updated.filter((c) => c._id !== message.conversation)];
      });

      if (fromSelf) return;

      const isHidden = typeof document !== 'undefined' && document.hidden;
      if (!isActive || isHidden) {
        playNotificationSound();
      }
      if (isHidden && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const body = message.attachment ? `📎 ${message.attachment.fileName}` : message.content;
        const notification = new Notification(fullName(message.sender), { body });
        notification.onclick = () => {
          window.focus();
          setConversations((prev) => {
            const conv = prev.find((c) => c._id === message.conversation);
            if (conv) setActive(conv);
            return prev;
          });
        };
      }
    }

    function handleGroupUpdated({ conversation }: { conversation: Conversation }) {
      setConversations((prev) => prev.map((c) => (c._id === conversation._id ? { ...c, ...conversation } : c)));
      setActive((prev) => (prev && prev._id === conversation._id ? { ...prev, ...conversation } : prev));
    }

    function handleGroupRemoved({ conversationId }: { conversationId: string }) {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      setActive((prev) => (prev && prev._id === conversationId ? null : prev));
    }

    socket.on('message:new', handleNewMessage);
    socket.on('group:updated', handleGroupUpdated);
    socket.on('group:removed', handleGroupRemoved);
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('group:updated', handleGroupUpdated);
      socket.off('group:removed', handleGroupRemoved);
    };
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
        <p className="text-[#8696a0]">{t('common.loading')}</p>
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
              conversation={active}
              focusMessageId={focusMessageId}
              onFocused={() => setFocusMessageId(null)}
              onBack={() => setActive(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[#0b141a]">
              <p className="text-[#8696a0]">{t('chat.selectConversation')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
