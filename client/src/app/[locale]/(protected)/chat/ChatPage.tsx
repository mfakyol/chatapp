'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/hooks/useT';
import { initChatSocket, loadConversations } from '@/services/chat.service';
import { useChatStore } from '@/stores/chat.store';

export function ChatPage() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const activeId = useChatStore((s) => s.activeId);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!user) return;
    return initChatSocket(user.username);
  }, [user]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <Sidebar hidden={!!activeId} />
      <div className={`${activeId ? 'flex' : 'hidden md:flex'} min-h-0 flex-1`}>
        {activeId ? <ChatWindow key={activeId} /> : (
          <div className="flex flex-1 items-center justify-center bg-(--bg-chat)">
            <EmptyState padding="centered">{t('chat.selectConversation')}</EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
