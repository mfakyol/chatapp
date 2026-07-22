'use client';

import { useEffect, useState } from 'react';
import {
  IconMessageCircle2,
  IconUsers,
  IconSearch,
  IconLogout,
  IconUserPlus,
  IconCheck,
  IconX,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Conversation, FriendRequests, MessageSearchResult, PublicUser } from '@/types';
import {
  acceptFriendRequest,
  createDirectConversation,
  createGroupConversation,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  searchMessages,
  searchUsers,
  sendFriendRequest,
} from '@/lib/resources';
import { conversationName, fullName, otherParticipant } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import { usePresenceMap } from '@/hooks/usePresence';

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

  function isUserOnline(u: PublicUser): boolean {
    const id = u.id || u._id;
    const live = id ? presence[id]?.isOnline : undefined;
    return live ?? u.isOnline ?? false;
  }

  function lastMessagePreview(c: Conversation): string {
    if (!c.lastMessage) return 'No messages yet';
    if (c.lastMessage.attachment) return `📎 ${c.lastMessage.attachment.fileName}`;
    return c.lastMessage.content;
  }

  const [tab, setTab] = useState<Tab>('chats');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ received: [], sent: [] });
  const [groupMode, setGroupMode] = useState(false);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [messageQuery, setMessageQuery] = useState('');
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);

  function pushToast(text: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function refreshPeople() {
    const [friendsRes, requestsRes] = await Promise.all([getFriends(), getFriendRequests()]);
    setFriends(friendsRes.friends);
    setRequests(requestsRes);
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
      pushToast(`${fullName(from)} sent you a friend request`);
    }

    function handleAccepted({ user: other }: { user: PublicUser }) {
      setRequests((prev) => ({
        received: prev.received.filter((u) => u.username !== other.username),
        sent: prev.sent.filter((u) => u.username !== other.username),
      }));
      setFriends((prev) => (prev.some((u) => u.username === other.username) ? prev : [...prev, other]));
      pushToast(`${fullName(other)} accepted your friend request`);
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

  useEffect(() => {
    if (tab !== 'people' || !query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await searchUsers(query.trim());
      setResults(res.users);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, tab]);

  useEffect(() => {
    if (!messageQuery.trim()) {
      setMessageResults([]);
      return;
    }
    setSearchingMessages(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchMessages(messageQuery.trim());
        setMessageResults(res.messages);
      } finally {
        setSearchingMessages(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [messageQuery]);

  function messageSnippet(m: MessageSearchResult): string {
    if (m.attachment) return `📎 ${m.attachment.fileName}`;
    return m.content;
  }

  function searchResultConversationName(m: MessageSearchResult): string {
    if (m.conversation.isGroup) return m.conversation.name || 'Unnamed group';
    const other = m.conversation.participants.find((p) => p.username !== user?.username);
    return other ? fullName(other) : 'Unknown';
  }

  async function handleAddFriend(username: string) {
    setError('');
    try {
      await sendFriendRequest(username);
      setResults((prev) => prev.filter((u) => u.username !== username));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    }
  }

  async function handleAccept(username: string) {
    await acceptFriendRequest(username);
    refreshPeople();
  }

  async function handleDecline(username: string) {
    await declineFriendRequest(username);
    refreshPeople();
  }

  async function handleStartChat(username: string) {
    setError('');
    try {
      const { conversation } = await createDirectConversation(username);
      onConversationCreated(conversation);
      setTab('chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start chat');
    }
  }

  function toggleGroupMember(username: string) {
    setGroupSelection((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  }

  async function handleCreateGroup() {
    setError('');
    if (!groupName.trim() || groupSelection.length < 2) {
      setError('Pick a name and at least 2 friends for a group');
      return;
    }
    try {
      const { conversation } = await createGroupConversation(groupName.trim(), groupSelection);
      onConversationCreated(conversation);
      setGroupMode(false);
      setGroupSelection([]);
      setGroupName('');
      setTab('chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  }

  return (
    <div
      className={`relative ${hidden ? 'hidden md:flex' : 'flex'} h-full min-h-0 w-full flex-col border-r border-[#2a3942] bg-[#111b21] md:max-w-sm`}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-md bg-[#2a3942] px-3 py-2 text-xs text-[#e9edef] shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user ? fullName(user) : '?'} size={40} />
          <div>
            <p className="text-sm font-medium text-[#e9edef]">{user ? fullName(user) : ''}</p>
            <p className="text-xs text-[#8696a0]">@{user?.username}</p>
          </div>
        </div>
        <button onClick={logout} title="Log out" className="rounded-full p-2 text-[#8696a0] hover:bg-[#2a3942]">
          <IconLogout size={20} />
        </button>
      </div>

      <div className="flex border-b border-[#2a3942]">
        <button
          onClick={() => setTab('chats')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${
            tab === 'chats' ? 'border-b-2 border-[#00a884] text-[#00a884]' : 'text-[#8696a0]'
          }`}
        >
          <IconMessageCircle2 size={18} /> Chats
        </button>
        <button
          onClick={() => setTab('people')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${
            tab === 'people' ? 'border-b-2 border-[#00a884] text-[#00a884]' : 'text-[#8696a0]'
          }`}
        >
          <IconUsers size={18} /> People
          {requests.received.length > 0 && (
            <span className="ml-1 rounded-full bg-[#00a884] px-1.5 text-xs text-[#111b21]">
              {requests.received.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'chats' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-[#2a3942] px-3 py-2">
            <IconSearch size={16} className="text-[#8696a0]" />
            <input
              value={messageQuery}
              onChange={(e) => setMessageQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-transparent py-1 text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
            />
          </div>

          {messageQuery.trim() ? (
            <div>
              {searchingMessages && <p className="p-4 text-sm text-[#8696a0]">Searching...</p>}
              {!searchingMessages && messageResults.length === 0 && (
                <p className="p-4 text-sm text-[#8696a0]">No messages found</p>
              )}
              {messageResults.map((m) => (
                <button
                  key={m._id}
                  onClick={() => onOpenSearchResult(m.conversation._id, m._id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#202c33]"
                >
                  <Avatar name={searchResultConversationName(m)} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-[#e9edef]">
                        {searchResultConversationName(m)}
                      </p>
                      <span className="shrink-0 text-[10px] text-[#8696a0]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[#8696a0]">
                      {m.sender.username === user?.username ? 'You: ' : `${m.sender.firstName}: `}
                      {messageSnippet(m)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              {conversations.length === 0 && (
                <p className="p-4 text-sm text-[#8696a0]">No conversations yet. Add a friend to start chatting.</p>
              )}
              {conversations.map((c) => (
            <button
              key={c._id}
              onClick={() => onSelectConversation(c)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#202c33] ${
                activeConversationId === c._id ? 'bg-[#2a3942]' : ''
              }`}
            >
              <Avatar
                name={conversationName(c, user?.username || '')}
                isOnline={!c.isGroup && (() => {
                  const other = otherParticipant(c, user?.username || '');
                  return other ? isUserOnline(other) : false;
                })()}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#e9edef]">
                  {conversationName(c, user?.username || '')}
                </p>
                <p className="truncate text-xs text-[#8696a0]">{lastMessagePreview(c)}</p>
              </div>
              {!!c.unreadCount && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00a884] px-1.5 text-xs font-medium text-[#111b21]">
                  {c.unreadCount}
                </span>
              )}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#e9edef]">
              {groupMode ? 'New group' : 'Search by username'}
            </h3>
            <button
              onClick={() => {
                setGroupMode((v) => !v);
                setGroupSelection([]);
                setError('');
              }}
              className="flex items-center gap-1 text-xs text-[#00a884] hover:underline"
            >
              <IconUsersGroup size={16} /> {groupMode ? 'Cancel' : 'New group'}
            </button>
          </div>

          {groupMode ? (
            <div className="mb-6 flex flex-col gap-3">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className="rounded-md bg-[#2a3942] px-3 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
              />
              <p className="text-xs text-[#8696a0]">Select at least 2 friends</p>
              {friends.map((f) => (
                <label key={f.username} className="flex items-center gap-2 text-sm text-[#e9edef]">
                  <input
                    type="checkbox"
                    checked={groupSelection.includes(f.username)}
                    onChange={() => toggleGroupMember(f.username)}
                  />
                  {fullName(f)} <span className="text-[#8696a0]">@{f.username}</span>
                </label>
              ))}
              <button
                onClick={handleCreateGroup}
                className="mt-2 rounded-md bg-[#00a884] py-2 text-sm font-medium text-[#111b21]"
              >
                Create group
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-md bg-[#2a3942] px-3 py-2">
                <IconSearch size={16} className="text-[#8696a0]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search username..."
                  className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
                />
              </div>

              {query.trim() && (
                <div className="mb-6">
                  {results.length === 0 && <p className="text-xs text-[#8696a0]">No users found</p>}
                  {results.map((u) => (
                    <div key={u.username} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={fullName(u)} size={32} />
                        <div>
                          <p className="text-sm text-[#e9edef]">{fullName(u)}</p>
                          <p className="text-xs text-[#8696a0]">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFriend(u.username)}
                        className="rounded-full p-2 text-[#00a884] hover:bg-[#2a3942]"
                        title="Add friend"
                      >
                        <IconUserPlus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {requests.received.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-[#8696a0]">Friend requests</h4>
                  {requests.received.map((u) => (
                    <div key={u.username} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={fullName(u)} size={32} />
                        <div>
                          <p className="text-sm text-[#e9edef]">{fullName(u)}</p>
                          <p className="text-xs text-[#8696a0]">@{u.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAccept(u.username)}
                          className="rounded-full p-2 text-[#00a884] hover:bg-[#2a3942]"
                        >
                          <IconCheck size={18} />
                        </button>
                        <button
                          onClick={() => handleDecline(u.username)}
                          className="rounded-full p-2 text-red-400 hover:bg-[#2a3942]"
                        >
                          <IconX size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-[#8696a0]">Friends</h4>
                {friends.length === 0 && <p className="text-xs text-[#8696a0]">No friends yet</p>}
                {friends.map((f) => (
                  <div key={f.username} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={fullName(f)} isOnline={isUserOnline(f)} size={32} />
                      <div>
                        <p className="text-sm text-[#e9edef]">{fullName(f)}</p>
                        <p className="text-xs text-[#8696a0]">@{f.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartChat(f.username)}
                      className="text-xs text-[#00a884] hover:underline"
                    >
                      Message
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
