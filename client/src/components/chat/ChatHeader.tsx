'use client';

import { IconArrowLeft, IconSearch } from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { usePresence } from '@/hooks/usePresence';
import { useT } from '@/hooks/useT';
import { openProfile, toggleSearch } from '@/services/chatWindow.service';
import { closeActive } from '@/services/chat.service';
import { useChatWindowStore } from '@/stores/chatWindow.store';
import { selectActiveConversation, useChatStore } from '@/stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { formatLastSeen } from '@/lib/format';
import { conversationName, otherParticipant, userId } from '@/lib/utils';

export function ChatHeader() {
  const { t } = useT();
  const conversation = useChatStore(selectActiveConversation);
  const currentUsername = useAuthStore((s) => s.user?.username || '');
  const typingUsers = useChatWindowStore((s) => s.typingUsers);
  const other = conversation && !conversation.isGroup ? otherParticipant(conversation, currentUsername) : undefined;
  const otherId = other ? userId(other) : undefined;
  const otherLive = usePresence(otherId);

  if (!conversation) return null;

  let subtitle = '';
  if (conversation.isGroup) {
    const typingNames = typingUsers
      .map((id) => conversation.participants.find((p) => userId(p) === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => p.firstName);
    if (typingNames.length === 1) subtitle = t('chat.typingOne', { name: typingNames[0] });
    else if (typingNames.length > 1) subtitle = t('chat.typingMany', { names: typingNames.join(', ') });
  } else {
    const typing = typingUsers.length > 0;
    if (typing) subtitle = t('chat.typing');
    else {
      const isOnline = otherLive?.isOnline ?? other?.isOnline ?? false;
      subtitle = isOnline ? t('chat.online') : formatLastSeen(otherLive?.lastSeen ?? other?.lastSeen);
    }
  }

  const isOnline = !conversation.isGroup && (otherLive?.isOnline ?? other?.isOnline ?? false);
  const title = conversationName(conversation, currentUsername);

  return (
    <PanelHeader surface>
      <Button variant="icon" onClick={closeActive} className="md:hidden" aria-label={t('common.cancel')}>
          <IconArrowLeft size={20} />
      </Button>
      <Button
        variant="unstyled"
        onClick={openProfile}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Avatar name={title} isOnline={isOnline} size={40} user={other} />
        <div className="min-w-0">
          <p className="truncate font-medium text-(--text-normal)">{title}</p>
          <p className="truncate text-xs text-(--text-muted)">{subtitle}</p>
        </div>
      </Button>
      <Button
        variant="icon"
        onClick={toggleSearch}
        title={t('chat.searchInConversation')}
        aria-label={t('chat.searchInConversation')}
      >
        <IconSearch size={20} />
      </Button>
    </PanelHeader>
  );
}
