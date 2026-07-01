'use client';

import { useEffect, useState } from 'react';
import { IconX, IconPencil, IconUserPlus, IconUserMinus, IconLogout2, IconCheck } from '@tabler/icons-react';
import { Avatar } from '@/components/Avatar';
import { Conversation, PublicUser } from '@/types';
import { fullName, otherParticipant, formatLastSeen } from '@/lib/utils';
import { usePresenceMap } from '@/context/PresenceContext';
import { useAuth } from '@/context/AuthContext';
import { getFriends, renameGroup, addGroupMember, removeGroupMember, leaveGroup } from '@/lib/resources';

export function ProfilePanel({
  conversation,
  currentUsername,
  onClose,
}: {
  conversation: Conversation;
  currentUsername: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const presence = usePresenceMap();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(conversation.name);
  const [addingMember, setAddingMember] = useState(false);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [error, setError] = useState('');

  const currentUserId = user?.id || user?._id;
  const isAdmin = !!currentUserId && (conversation.admins || []).some((id) => id === currentUserId);

  useEffect(() => {
    setNameDraft(conversation.name);
  }, [conversation.name]);

  useEffect(() => {
    if (addingMember) getFriends().then((res) => setFriends(res.friends));
  }, [addingMember]);

  function liveStatus(userId?: string, fallbackOnline?: boolean, fallbackLastSeen?: string) {
    const live = userId ? presence[userId] : undefined;
    return {
      isOnline: live?.isOnline ?? fallbackOnline ?? false,
      lastSeen: live?.lastSeen ?? fallbackLastSeen,
    };
  }

  const other = !conversation.isGroup ? otherParticipant(conversation, currentUsername) : undefined;
  const otherStatus = other ? liveStatus(other.id || other._id, other.isOnline, other.lastSeen) : null;

  async function handleRename() {
    setError('');
    if (!nameDraft.trim()) return;
    try {
      await renameGroup(conversation._id, nameDraft.trim());
      setRenaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename group');
    }
  }

  async function handleAddMember(username: string) {
    setError('');
    try {
      await addGroupMember(conversation._id, username);
      setFriends((prev) => prev.filter((f) => f.username !== username));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  }

  async function handleRemoveMember(username: string) {
    setError('');
    try {
      await removeGroupMember(conversation._id, username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  async function handleLeave() {
    if (!window.confirm('Leave this group?')) return;
    try {
      await leaveGroup(conversation._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group');
    }
  }

  const availableFriends = friends.filter(
    (f) => !conversation.participants.some((p) => p.username === f.username)
  );

  return (
    <div className="fixed inset-0 z-30 flex h-full w-full shrink-0 flex-col border-l border-[#2a3942] bg-[#111b21] md:static md:z-auto md:w-80">
      <div className="flex items-center gap-3 border-b border-[#2a3942] px-4 py-3">
        <button onClick={onClose} className="rounded-full p-1 text-[#8696a0] hover:bg-[#2a3942]">
          <IconX size={20} />
        </button>
        <p className="font-medium text-[#e9edef]">{conversation.isGroup ? 'Group info' : 'Contact info'}</p>
      </div>

      <div className="flex flex-col items-center gap-2 border-b border-[#2a3942] px-4 py-8">
        <Avatar
          name={conversation.isGroup ? conversation.name : other ? fullName(other) : '?'}
          isOnline={!conversation.isGroup && otherStatus?.isOnline}
          size={96}
        />
        {conversation.isGroup ? (
          renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="rounded bg-[#2a3942] px-2 py-1 text-sm text-[#e9edef] outline-none"
              />
              <button onClick={handleRename} className="text-[#00a884]">
                <IconCheck size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-medium text-[#e9edef]">{conversation.name}</p>
              {isAdmin && (
                <button onClick={() => setRenaming(true)} className="text-[#8696a0] hover:text-[#e9edef]">
                  <IconPencil size={16} />
                </button>
              )}
            </div>
          )
        ) : (
          <p className="text-lg font-medium text-[#e9edef]">{other ? fullName(other) : ''}</p>
        )}
        {!conversation.isGroup && other && (
          <>
            <p className="text-sm text-[#8696a0]">@{other.username}</p>
            <p className="text-xs text-[#8696a0]">
              {otherStatus?.isOnline ? 'online' : formatLastSeen(otherStatus?.lastSeen) || 'offline'}
            </p>
          </>
        )}
      </div>

      {conversation.isGroup && (
        <>
          {error && <p className="px-4 pt-3 text-sm text-red-400">{error}</p>}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-[#8696a0]">
                {conversation.participants.length} members
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setAddingMember((v) => !v)}
                  className="flex items-center gap-1 text-xs text-[#00a884] hover:underline"
                >
                  <IconUserPlus size={14} /> Add
                </button>
              )}
            </div>

            {addingMember && (
              <div className="mb-3 rounded-md bg-[#202c33] p-2">
                {availableFriends.length === 0 && (
                  <p className="p-2 text-xs text-[#8696a0]">No friends available to add</p>
                )}
                {availableFriends.map((f) => (
                  <button
                    key={f.username}
                    onClick={() => handleAddMember(f.username)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[#e9edef] hover:bg-[#2a3942]"
                  >
                    <Avatar name={fullName(f)} size={24} />
                    {fullName(f)}
                  </button>
                ))}
              </div>
            )}

            {conversation.participants.map((p) => {
              const status = liveStatus(p.id || p._id, p.isOnline, p.lastSeen);
              return (
                <div key={p.username} className="flex items-center gap-3 py-2">
                  <Avatar name={fullName(p)} isOnline={status.isOnline} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[#e9edef]">
                      {fullName(p)} {p.username === currentUsername && <span className="text-[#8696a0]">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-[#8696a0]">@{p.username}</p>
                  </div>
                  {isAdmin && p.username !== currentUsername && (
                    <button
                      onClick={() => handleRemoveMember(p.username)}
                      title="Remove from group"
                      className="rounded-full p-1.5 text-[#8696a0] hover:bg-[#2a3942] hover:text-red-400"
                    >
                      <IconUserMinus size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#2a3942] p-4">
            <button
              onClick={handleLeave}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2a3942] py-2 text-sm text-red-400 hover:bg-[#33424b]"
            >
              <IconLogout2 size={18} /> Leave group
            </button>
          </div>
        </>
      )}
    </div>
  );
}
