'use client';

import { useEffect, useState } from 'react';
import { IconX, IconPencil, IconUserPlus, IconUserMinus, IconLogout2, IconCheck } from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { Conversation, PublicUser } from '@/types';
import { fullName, otherParticipant, formatLastSeen } from '@/lib/utils';
import { t } from '@/i18n';
import { usePresenceMap } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { getFriends } from '@/services/user.service';
import {
  renameGroup,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
} from '@/services/conversation.service';

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
    if (addingMember) {
      getFriends().then((res) => {
        if (res.success) setFriends(res.data.friends);
      });
    }
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
    const res = await renameGroup(conversation._id, nameDraft.trim());
    if (!res.success) return setError(res.error);
    setRenaming(false);
  }

  async function handleAddMember(username: string) {
    setError('');
    const res = await addGroupMember(conversation._id, username);
    if (!res.success) return setError(res.error);
    setFriends((prev) => prev.filter((f) => f.username !== username));
  }

  async function handleRemoveMember(username: string) {
    setError('');
    const res = await removeGroupMember(conversation._id, username);
    if (!res.success) setError(res.error);
  }

  async function handleLeave() {
    if (!window.confirm(t('profile.confirmLeave'))) return;
    const res = await leaveGroup(conversation._id);
    if (!res.success) setError(res.error);
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
        <p className="font-medium text-[#e9edef]">
          {conversation.isGroup ? t('profile.groupInfo') : t('profile.contactInfo')}
        </p>
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
              {otherStatus?.isOnline
                ? t('profile.online')
                : formatLastSeen(otherStatus?.lastSeen) || t('profile.offline')}
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
                {t('profile.membersCount', { count: conversation.participants.length })}
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setAddingMember((v) => !v)}
                  className="flex items-center gap-1 text-xs text-[#00a884] hover:underline"
                >
                  <IconUserPlus size={14} /> {t('profile.add')}
                </button>
              )}
            </div>

            {addingMember && (
              <div className="mb-3 rounded-md bg-[#202c33] p-2">
                {availableFriends.length === 0 && (
                  <p className="p-2 text-xs text-[#8696a0]">{t('profile.noFriendsToAdd')}</p>
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
                      {fullName(p)}{' '}
                      {p.username === currentUsername && (
                        <span className="text-[#8696a0]">{t('common.you')}</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-[#8696a0]">@{p.username}</p>
                  </div>
                  {isAdmin && p.username !== currentUsername && (
                    <button
                      onClick={() => handleRemoveMember(p.username)}
                      title={t('profile.removeFromGroup')}
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
              <IconLogout2 size={18} /> {t('profile.leaveGroup')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
