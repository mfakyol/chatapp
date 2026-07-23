'use client';

import { useEffect, useState } from 'react';
import { IconLogout, IconMessageCircle2, IconUsers } from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { usePresenceMap } from '@/hooks/usePresence';
import { Avatar } from '@/components/ui/Avatar';
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
import { getSocket } from '@/lib/socket';
import { t } from '@/i18n';

interface Toast {
  id: number;
  text: string;
}

type Tab = 'chats' | 'people';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onConversationCreated: (conversation: Conversation) => void;
  onOpenSearchResult: (conversationId: string, messageId: string) => void;
  hidden?: boolean;
}

/**
 * Sidebar orchestrator: owns the friends/requests data, friend socket events
 * and toasts; the tabs render through ChatsPanel and PeoplePanel.
 */
export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onConversationCreated,
  onOpenSearchResult,
  hidden,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const presence = usePresenceMap();

  const [tab, setTab] = useState<Tab>('chats');
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ received: [], sent: [] });
  const [toasts, setToasts] = useState<Toast[]>([]);

  function isUserOnline(u: PublicUser): boolean {
    const id = userId(u);
    const live = id ? presence[id]?.isOnline : undefined;
    return live ?? u.isOnline ?? false;
  }

  function pushToast(text: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
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
    const socket = getSocket();
    if (!socket) return;

    function handleRequest({ user: from }: { user: PublicUser }) {
      setRequests((prev) =>
        prev.received.some((u) => u.username === from.username)
          ? prev
          : { ...prev, received: [...prev.received, from] }
      );
      pushToast(t('sidebar.toastRequest', { name: fullName(from) }));
    }

    function handleAccepted({ user: other }: { user: PublicUser }) {
      setRequests((prev) => ({
        received: prev.received.filter((u) => u.username !== other.username),
        sent: prev.sent.filter((u) => u.username !== other.username),
      }));
      setFriends((prev) => (prev.some((u) => u.username === other.username) ? prev : [...prev, other]));
      pushToast(t('sidebar.toastAccepted', { name: fullName(other) }));
    }

    function handleDeclined({ user: other }: { user: PublicUser }) {
      setRequests((prev) => ({ ...prev, sent: prev.sent.filter((u) => u.username !== other.username) }));
    }

    function handleRemoved({ user: other }: { user: PublicUser }) {
      setFriends((prev) => prev.filter((u) => u.username !== other.username));
    }

    socket.on('friend:request', handleRequest);
    socket.on('friend:accepted', handleAccepted);
    socket.on('friend:declined', handleDeclined);
    socket.on('friend:removed', handleRemoved);

    return () => {
      socket.off('friend:request', handleRequest);
      socket.off('friend:accepted', handleAccepted);
      socket.off('friend:declined', handleDeclined);
      socket.off('friend:removed', handleRemoved);
    };
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
      className={`relative ${hidden ? 'hidden md:flex' : 'flex'} h-full min-h-0 w-full flex-col border-r border-[var(--border)] bg-[var(--bg-app)] md:max-w-sm`}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-md bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-normal)] shadow-lg"
          >
            {toast.text}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user ? fullName(user) : '?'} size={40} />
          <div>
            <p className="text-sm font-medium text-[var(--text-normal)]">{user ? fullName(user) : ''}</p>
            <p className="text-xs text-[var(--text-muted)]">@{user?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={logout} title={t('sidebar.logOut')} className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">
            <IconLogout size={20} />
          </button>
        </div>
      </div>

      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setTab('chats')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${
            tab === 'chats' ? 'border-b-2 border-[var(--brand)] text-[var(--brand)]' : 'text-[var(--text-muted)]'
          }`}
        >
          <IconMessageCircle2 size={18} /> {t('sidebar.chats')}
        </button>
        <button
          onClick={() => setTab('people')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${
            tab === 'people' ? 'border-b-2 border-[var(--brand)] text-[var(--brand)]' : 'text-[var(--text-muted)]'
          }`}
        >
          <IconUsers size={18} /> {t('sidebar.people')}
          {requests.received.length > 0 && (
            <span className="ml-1 rounded-full bg-[var(--brand)] px-1.5 text-xs text-[var(--brand-text)]">
              {requests.received.length}
            </span>
          )}
        </button>
      </div>

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
