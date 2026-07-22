'use client';

import { useEffect, useRef, useState } from 'react';
import {
  IconSend,
  IconPaperclip,
  IconFile,
  IconDownload,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconInfoCircle,
  IconMoodSmile,
  IconSearch,
  IconX,
  IconArrowLeft,
} from '@tabler/icons-react';
import { Avatar } from '@/components/Avatar';
import { ProfilePanel } from '@/components/ProfilePanel';
import { MessageTicks } from '@/components/MessageTicks';
import { Conversation, Message, MessageSearchResult, ReadReceipt } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { usePresenceMap } from '@/hooks/usePresence';
import { getSocket } from '@/lib/socket';
import { getMessages, getOlderMessages, sendAttachment, searchMessages, editMessage, deleteMessage } from '@/lib/resources';
import { conversationName, otherParticipant, fileUrl, formatFileSize, formatLastSeen } from '@/lib/utils';

const EMOJIS = [
  '😀', '😂', '😍', '😊', '😉', '😎', '🤔', '😢', '😭', '😡',
  '👍', '👎', '👏', '🙏', '💪', '🎉', '❤️', '🔥', '✨', '💯',
  '😴', '😅', '🙌', '🤝', '👋', '🤷', '😱', '🥳', '🤩', '😇',
];

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
  const { user } = useAuth();
  const presence = usePresenceMap();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isTypingRef = useRef(false);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoScrollRef = useRef(false);

  const other = !conversation.isGroup ? otherParticipant(conversation, user?.username || '') : undefined;
  const otherId = other?.id || other?._id;
  const otherLive = otherId ? presence[otherId] : undefined;
  const otherIsOnline = otherLive?.isOnline ?? other?.isOnline ?? false;
  const otherLastSeen = otherLive?.lastSeen ?? other?.lastSeen;

  const typingNames = Array.from(typingUsers)
    .map((id) => conversation.participants.find((p) => (p.id || p._id) === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => p.firstName);
  const typingLabel =
    typingNames.length === 0
      ? ''
      : conversation.isGroup
        ? `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing...`
        : 'typing...';

  useEffect(() => {
    let active = true;
    setShowProfile(false);
    setShowSearch(false);
    setSearchQuery('');
    setMenuOpenId(null);
    setEditingId(null);
    setHasMore(true);
    setLoadingMore(false);

    getMessages(conversation._id).then((res) => {
      if (active) setMessages(res.messages);
      if (active && res.messages.length < 50) setHasMore(false);
    });

    const socket = getSocket();
    socket?.emit('conversation:join', conversation._id);
    socket?.emit('message:read', { conversationId: conversation._id });

    function handleNewMessage({ message }: { message: Message }) {
      if (message.conversation !== conversation._id) return;
      setMessages((prev) => [...prev, message]);
      if (message.sender.username !== user?.username) {
        socket?.emit('message:read', { conversationId: conversation._id });
      }
    }

    function handleEdited({ message }: { message: Message }) {
      if (message.conversation !== conversation._id) return;
      setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
    }

    function handleDeleted({ conversationId, messageId }: { conversationId: string; messageId: string }) {
      if (conversationId !== conversation._id) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, content: '', attachment: undefined, deletedAt: new Date().toISOString() } : m))
      );
    }

    function handleRead({
      conversationId,
      userId,
      readAt,
      messageIds,
    }: {
      conversationId: string;
      userId: string;
      readAt: string;
      messageIds: string[];
    }) {
      if (conversationId !== conversation._id) return;
      const idSet = new Set(messageIds);
      const isReader = (u: { id?: string; _id?: string }) => (u.id || u._id) === userId;
      setMessages((prev) =>
        prev.map((m) => {
          if (!idSet.has(m._id)) return m;
          if (m.readBy.some((r) => isReader(r.user))) return m;
          const reader = isReader(m.sender)
            ? m.sender
            : conversation.participants.find((p) => isReader(p));
          const receipt: ReadReceipt = {
            user: reader || { username: 'unknown', firstName: 'Someone', lastName: '' },
            readAt,
          };
          return { ...m, readBy: [...m.readBy, receipt] };
        })
      );
    }

    function clearTypingTimeout(userId: string) {
      const existing = typingTimeoutsRef.current.get(userId);
      if (existing) clearTimeout(existing);
      typingTimeoutsRef.current.delete(userId);
    }

    function handleTypingStart({ conversationId, userId }: { conversationId: string; userId: string }) {
      if (conversationId !== conversation._id) return;
      setTypingUsers((prev) => new Set(prev).add(userId));
      clearTypingTimeout(userId);
      typingTimeoutsRef.current.set(
        userId,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }, 3000)
      );
    }

    function handleTypingStop({ conversationId, userId }: { conversationId: string; userId: string }) {
      if (conversationId !== conversation._id) return;
      clearTypingTimeout(userId);
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }

    socket?.on('message:new', handleNewMessage);
    socket?.on('message:edited', handleEdited);
    socket?.on('message:deleted', handleDeleted);
    socket?.on('message:read', handleRead);
    socket?.on('typing:start', handleTypingStart);
    socket?.on('typing:stop', handleTypingStop);
    return () => {
      active = false;
      socket?.off('message:new', handleNewMessage);
      socket?.off('message:edited', handleEdited);
      socket?.off('message:deleted', handleDeleted);
      socket?.off('message:read', handleRead);
      socket?.off('typing:start', handleTypingStart);
      socket?.off('typing:stop', handleTypingStop);
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
      setTypingUsers(new Set());
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation._id]);

  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }
    if (!highlightedId) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightedId]);

  async function loadMore() {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    setLoadingMore(true);
    try {
      const res = await getOlderMessages(conversation._id, messages[0].createdAt);
      if (res.messages.length === 0) {
        setHasMore(false);
        return;
      }
      skipAutoScrollRef.current = true;
      setMessages((prev) => [...res.messages, ...prev]);
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } finally {
      setLoadingMore(false);
    }
  }

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop < 80) {
      loadMore();
    }
  }

  async function jumpToMessage(messageId: string) {
    const existing = messageRefs.current.get(messageId);
    if (existing) {
      existing.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const res = await getMessages(conversation._id, messageId);
      setHasMore(true);
      skipAutoScrollRef.current = true;
      setMessages(res.messages);
      requestAnimationFrame(() => {
        messageRefs.current.get(messageId)?.scrollIntoView({ block: 'center' });
      });
    }
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId(null), 2000);
  }

  useEffect(() => {
    if (focusMessageId) {
      jumpToMessage(focusMessageId).then(() => onFocused?.());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMessageId]);

  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await searchMessages(searchQuery.trim(), conversation._id);
      setSearchResults(res.messages);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, showSearch, conversation._id]);

  function stopTyping() {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      getSocket()?.emit('typing:stop', { conversationId: conversation._id });
      isTypingRef.current = false;
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    const socket = getSocket();
    if (!isTypingRef.current) {
      socket?.emit('typing:start', { conversationId: conversation._id });
      isTypingRef.current = true;
    }
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = setTimeout(stopTyping, 2000);
  }

  function handleSend() {
    if (!draft.trim()) return;
    stopTyping();
    const socket = getSocket();
    socket?.emit('message:send', { conversationId: conversation._id, content: draft.trim() });
    setDraft('');
  }

  function handleEmojiPick(emoji: string) {
    setDraft((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await sendAttachment(conversation._id, file);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function startEdit(m: Message) {
    setMenuOpenId(null);
    setEditingId(m._id);
    setEditDraft(m.content);
  }

  async function saveEdit(messageId: string) {
    if (!editDraft.trim()) return;
    try {
      const res = await editMessage(conversation._id, messageId, editDraft.trim());
      setMessages((prev) => prev.map((m) => (m._id === messageId ? res.message : m)));
    } finally {
      setEditingId(null);
    }
  }

  async function handleDelete(messageId: string) {
    setMenuOpenId(null);
    if (!window.confirm('Delete this message?')) return;
    await deleteMessage(conversation._id, messageId);
    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, content: '', attachment: undefined, deletedAt: new Date().toISOString() } : m))
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0b141a]">
        <div className="flex items-center gap-3 border-b border-[#2a3942] bg-[#202c33] px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="rounded-full p-2 text-[#8696a0] hover:bg-[#2a3942] md:hidden">
              <IconArrowLeft size={20} />
            </button>
          )}
          <button
            onClick={() => setShowProfile(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <Avatar name={conversationName(conversation, user?.username || '')} isOnline={!conversation.isGroup && otherIsOnline} size={40} />
            <div className="min-w-0">
              <p className="truncate font-medium text-[#e9edef]">
                {conversationName(conversation, user?.username || '')}
              </p>
              <p className="truncate text-xs text-[#8696a0]">
                {typingLabel || (conversation.isGroup ? '' : otherIsOnline ? 'online' : formatLastSeen(otherLastSeen))}
              </p>
            </div>
          </button>
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="rounded-full p-2 text-[#8696a0] hover:bg-[#2a3942]"
            title="Search in conversation"
          >
            <IconSearch size={20} />
          </button>
        </div>

        {showSearch && (
          <div className="border-b border-[#2a3942] bg-[#111b21] p-3">
            <div className="flex items-center gap-2 rounded-md bg-[#2a3942] px-3 py-2">
              <IconSearch size={16} className="text-[#8696a0]" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in this conversation..."
                className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
              />
              <button onClick={() => setShowSearch(false)} className="text-[#8696a0]">
                <IconX size={16} />
              </button>
            </div>
            {searchQuery.trim() && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                {searchResults.length === 0 && <p className="p-2 text-xs text-[#8696a0]">No messages found</p>}
                {searchResults.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => jumpToMessage(m._id)}
                    className="flex w-full flex-col items-start rounded px-2 py-2 text-left hover:bg-[#202c33]"
                  >
                    <span className="text-xs font-medium text-[#00a884]">{m.sender.firstName}</span>
                    <span className="truncate text-sm text-[#e9edef]">
                      {m.attachment ? `📎 ${m.attachment.fileName}` : m.content}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
          {loadingMore && (
            <p className="mb-2 text-center text-xs text-[#8696a0]">Loading older messages...</p>
          )}
          {!hasMore && messages.length > 0 && (
            <p className="mb-2 text-center text-xs text-[#8696a0]">Start of conversation</p>
          )}
          {messages.map((m) => {
            const mine = m.sender.username === user?.username;
            const deleted = !!m.deletedAt;
            return (
              <div key={m._id} className={`group mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="relative max-w-xs"
                  ref={(el) => {
                    if (el) messageRefs.current.set(m._id, el);
                    else messageRefs.current.delete(m._id);
                  }}
                >
                  {mine && !deleted && (
                    <div className="absolute -top-2 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setMenuOpenId((id) => (id === m._id ? null : m._id))}
                        className="rounded-full bg-[#2a3942] p-1 text-[#e9edef] shadow"
                      >
                        <IconDotsVertical size={14} />
                      </button>
                      {menuOpenId === m._id && (
                        <div className="absolute right-0 top-6 z-20 w-40 rounded-md bg-[#202c33] py-1 text-sm shadow-lg">
                          <button
                            onClick={() => {
                              setOpenDetailId((id) => (id === m._id ? null : m._id));
                              setMenuOpenId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#e9edef] hover:bg-[#2a3942]"
                          >
                            <IconInfoCircle size={16} /> Info
                          </button>
                          {!m.attachment && (
                            <button
                              onClick={() => startEdit(m)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#e9edef] hover:bg-[#2a3942]"
                            >
                              <IconPencil size={16} /> Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(m._id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-[#2a3942]"
                          >
                            <IconTrash size={16} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      mine ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'
                    } ${highlightedId === m._id ? 'ring-2 ring-[#00a884]' : ''}`}
                  >
                    {conversation.isGroup && !mine && !deleted && (
                      <p className="mb-0.5 text-xs font-semibold text-[#00a884]">{m.sender.firstName}</p>
                    )}

                    {deleted ? (
                      <p className="italic text-[#8696a0]">This message was deleted</p>
                    ) : editingId === m._id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(m._id)}
                          className="rounded bg-black/20 px-2 py-1 text-sm text-[#e9edef] outline-none"
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button onClick={() => setEditingId(null)} className="text-[#8696a0]">
                            Cancel
                          </button>
                          <button onClick={() => saveEdit(m._id)} className="text-[#00a884]">
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {m.attachment && m.attachment.mimeType.startsWith('image/') && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fileUrl(m.attachment.url)}
                            alt={m.attachment.fileName}
                            className="mb-1 max-h-60 w-full rounded object-cover"
                          />
                        )}
                        {m.attachment && !m.attachment.mimeType.startsWith('image/') && (
                          <a
                            href={fileUrl(m.attachment.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mb-1 flex items-center gap-2 rounded bg-black/20 px-2 py-2 hover:bg-black/30"
                          >
                            <IconFile size={22} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs">{m.attachment.fileName}</p>
                              <p className="text-[10px] text-[#8696a0]">{formatFileSize(m.attachment.size)}</p>
                            </div>
                            <IconDownload size={16} />
                          </a>
                        )}

                        {m.content && <p>{m.content}</p>}
                      </>
                    )}

                    {!deleted && (
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
                        {m.editedAt && <span>edited</span>}
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {mine && <MessageTicks message={m} currentUsername={user?.username || ''} />}
                      </div>
                    )}
                  </div>

                  {mine && openDetailId === m._id && (
                    <MessageDetail message={m} isGroup={conversation.isGroup} currentUsername={user?.username || ''} />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="relative flex items-center gap-2 border-t border-[#2a3942] bg-[#202c33] px-4 py-3">
          {showEmoji && (
            <div className="absolute bottom-full left-4 mb-2 grid grid-cols-6 gap-1 rounded-md bg-[#202c33] p-2 shadow-lg">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiPick(emoji)}
                  className="rounded p-1 text-xl hover:bg-[#2a3942]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach file"
            className="rounded-full p-2 text-[#8696a0] hover:bg-[#2a3942] disabled:opacity-50"
          >
            <IconPaperclip size={20} />
          </button>
          <button
            onClick={() => setShowEmoji((v) => !v)}
            title="Emoji"
            className="rounded-full p-2 text-[#8696a0] hover:bg-[#2a3942]"
          >
            <IconMoodSmile size={20} />
          </button>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={uploading ? 'Uploading file...' : 'Type a message'}
            className="flex-1 rounded-full bg-[#2a3942] px-4 py-2 text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
          />
          <button
            onClick={handleSend}
            className="rounded-full bg-[#00a884] p-2.5 text-[#111b21] hover:bg-[#06cf9c]"
          >
            <IconSend size={18} />
          </button>
        </div>
      </div>

      {showProfile && (
        <ProfilePanel
          conversation={conversation}
          currentUsername={user?.username || ''}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

function MessageDetail({
  message,
  isGroup,
  currentUsername,
}: {
  message: Message;
  isGroup: boolean;
  currentUsername: string;
}) {
  const sentAt = new Date(message.createdAt).toLocaleString();
  const readers = message.readBy.filter((r) => r.user.username !== currentUsername);

  return (
    <div className="mt-1 rounded-md bg-[#202c33] px-3 py-2 text-xs text-[#e9edef] shadow-lg">
      <p className="text-[#8696a0]">Sent: {sentAt}</p>
      {isGroup ? (
        readers.length > 0 ? (
          readers.map((r) => (
            <p key={r.user.username}>
              Seen by {r.user.firstName || r.user.username} · {new Date(r.readAt).toLocaleString()}
            </p>
          ))
        ) : (
          <p className="text-[#8696a0]">Not seen yet</p>
        )
      ) : readers.length > 0 ? (
        <p>Seen: {new Date(readers[0].readAt).toLocaleString()}</p>
      ) : (
        <p className="text-[#8696a0]">Delivered, not seen yet</p>
      )}
    </div>
  );
}
