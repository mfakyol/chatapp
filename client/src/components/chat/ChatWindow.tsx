'use client';

import { useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ProfilePanel } from '@/components/chat/ProfilePanel';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatSearchBar } from '@/components/chat/ChatSearchBar';
import { MessageList } from '@/components/chat/MessageList';
import { Composer } from '@/components/chat/Composer';
import { clearFocusMessage } from '@/services/chat.service';
import {
  closeChatWindow,
  closeProfile,
  jumpToMessage,
  openChatWindow,
  registerChatConfirm,
  unregisterChatConfirm,
} from '@/services/chatWindow.service';
import { useAuthStore } from '@/stores/auth.store';
import { selectActiveConversation, useChatStore } from '@/stores/chat.store';
import { useChatWindowStore } from '@/stores/chatWindow.store';

export function ChatWindow() {
  const user = useAuthStore((s) => s.user);
  const conversation = useChatStore(selectActiveConversation);
  const focusMessageId = useChatStore((s) => s.focusMessageId);
  const showProfile = useChatWindowStore((s) => s.showProfile);
  const initialLoading = useChatWindowStore((s) => s.initialLoading);
  const { confirm, confirmDialog } = useConfirm();
  const currentUsername = user?.username || '';

  useEffect(() => {
    registerChatConfirm(confirm);
    return unregisterChatConfirm;
  }, [confirm]);

  useEffect(() => {
    if (!conversation) return;
    openChatWindow(conversation._id, currentUsername);
    return closeChatWindow;
  }, [conversation?._id, currentUsername]);

  useEffect(() => {
    if (!focusMessageId || initialLoading) return;
    let active = true;
    jumpToMessage(focusMessageId).then(() => {
      if (active) clearFocusMessage();
    });
    return () => {
      active = false;
    };
  }, [focusMessageId, initialLoading]);

  if (!conversation) return null;

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex h-full min-h-0 flex-1 flex-col bg-(--bg-chat)">
        <ChatHeader />
        <ChatSearchBar />
        <MessageList />
        <Composer />
      </div>

      {showProfile && (
        <ProfilePanel conversation={conversation} currentUsername={currentUsername} onClose={closeProfile} />
      )}

      {confirmDialog}
    </div>
  );
}
