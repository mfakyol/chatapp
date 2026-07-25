'use client';

import { useEffect, useState } from 'react';
import { IconLogout, IconMessageCircle2, IconUsers } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/auth.store';
import { useLocalizedRouter } from '@/hooks/useLocalizedRouter';
import { usePresenceMap } from '@/hooks/usePresence';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TabBar, Tab } from '@/components/ui/TabBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChatsPanel } from '@/components/chat/ChatsPanel';
import { PeoplePanel } from '@/components/chat/PeoplePanel';
import { Conversation, FriendRequests, PublicUser } from '@/types';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
} from '@/services/user.service';
import { createDirectConversation } from '@/services/conversation.service';
import { fullName, userId } from '@/lib/utils';
import { subscribeFriendSocket } from '@/services/friendSocket.service';
import { useToastStore } from '@/stores/toast.store';
import { ToastStack } from '@/components/ui/ToastStack';
import { useT } from '@/hooks/useT';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onConversationCreated: (conversation: Conversation) => void;
  onOpenSearchResult: (conversationId: string, messageId: string) => void;
  hidden?: boolean;
}


export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onConversationCreated,
  onOpenSearchResult,
  hidden,
}: SidebarProps) {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useLocalizedRouter();
  const presence = usePresenceMap();

  const [tab, setTab] = useState<'chats' | 'people'>('chats');
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ received: [], sent: [] });

  function isUserOnline(u: PublicUser): boolean {
    const id = userId(u);
    const live = id ? presence[id]?.isOnline : undefined;
    return live ?? u.isOnline ?? false;
  }

  function refreshPeople() {
    getFriends().then((res) => {
      if (res.success) setFriends(res.data.friends);
    });
    getFriendRequests().then((res) => {
      if (res.success) setRequests(res.data);
    });
  }

  useEffect(() => {
    refreshPeople();
  }, []);

  useEffect(() => {
    return subscribeFriendSocket({
      onRequest: (from) => {
        setRequests((prev) =>
          prev.received.some((u) => u.username === from.username)
            ? prev
            : { ...prev, received: [...prev.received, from] }
        );
        useToastStore.getState().push(t('sidebar.toastRequest', { name: fullName(from) }));
      },
      onAccepted: (other) => {
        setRequests((prev) => ({
          received: prev.received.filter((u) => u.username !== other.username),
          sent: prev.sent.filter((u) => u.username !== other.username),
        }));
        setFriends((prev) => (prev.some((u) => u.username === other.username) ? prev : [...prev, other]));
        useToastStore.getState().push(t('sidebar.toastAccepted', { name: fullName(other) }));
      },
      onDeclined: (other) => {
        setRequests((prev) => ({ ...prev, sent: prev.sent.filter((u) => u.username !== other.username) }));
      },
      onRemoved: (other) => {
        setFriends((prev) => prev.filter((u) => u.username !== other.username));
      },
    });
  }, []);

  async function handleAccept(username: string) {
    await acceptFriendRequest(username);
    refreshPeople();
  }

  async function handleDecline(username: string) {
    await declineFriendRequest(username);
    refreshPeople();
  }

  async function handleUnfriend(username: string): Promise<string | null> {
    const res = await removeFriend(username);
    if (!res.success) return res.error;
    setFriends((prev) => prev.filter((f) => f.username !== username));
    return null;
  }

  async function handleStartChat(username: string): Promise<string | null> {
    const res = await createDirectConversation(username);
    if (!res.success) return res.error;
    onConversationCreated(res.data.conversation);
    setTab('chats');
    return null;
  }

  return (
    <div
      className={`relative ${hidden ? 'hidden md:flex' : 'flex'} h-full min-h-0 w-full flex-col border-r border-(--border) bg-(--bg-app) md:max-w-sm`}
    >
      <ToastStack />

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user ? fullName(user) : '?'} size={40} />
          <div>
            <p className="text-sm font-medium text-(--text-normal)">{user ? fullName(user) : ''}</p>
            <p className="text-xs text-(--text-muted)">@{user?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="icon"
            onClick={() => {
              logout();
              router.push('/login');
            }}
            title={t('sidebar.logOut')}
            aria-label={t('sidebar.logOut')}
          >
            <IconLogout size={20} />
          </Button>
        </div>
      </div>

      <TabBar>
        <Tab active={tab === 'chats'} onClick={() => setTab('chats')}>
          <IconMessageCircle2 size={18} /> {t('sidebar.chats')}
        </Tab>
        <Tab active={tab === 'people'} onClick={() => setTab('people')} badge={requests.received.length}>
          <IconUsers size={18} /> {t('sidebar.people')}
        </Tab>
      </TabBar>

      {tab === 'chats' && (
        <ChatsPanel
          conversations={conversations}
          activeConversationId={activeConversationId}
          currentUsername={user?.username || ''}
          isUserOnline={isUserOnline}
          onSelect={onSelectConversation}
          onOpenSearchResult={onOpenSearchResult}
        />
      )}

      {tab === 'people' && (
        <PeoplePanel
          friends={friends}
          requests={requests}
          isUserOnline={isUserOnline}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onUnfriend={handleUnfriend}
          onStartChat={handleStartChat}
          onConversationCreated={(conversation) => {
            onConversationCreated(conversation);
            setTab('chats');
          }}
        />
      )}
    </div>
  );
}
