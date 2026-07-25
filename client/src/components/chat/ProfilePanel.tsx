'use client';

import { useEffect, useState } from 'react';
import {
  IconX,
  IconPencil,
  IconUserPlus,
  IconUserMinus,
  IconLogout2,
  IconCheck,
  IconTrash,
} from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { FormError } from '@/components/ui/FormError';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Conversation, PublicUser } from '@/types';
import { formatLastSeen } from '@/lib/format';
import { fullName, otherParticipant, userId } from '@/lib/utils';
import { useT } from '@/hooks/useT';
import { usePresenceMap } from '@/hooks/usePresence';
import { useAuthStore } from '@/stores/auth.store';
import { getFriends } from '@/services/user.service';
import {
  renameGroup,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  deleteConversation,
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
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const presence = usePresenceMap();
  const { confirm, confirmDialog } = useConfirm();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [error, setError] = useState('');

  const currentUserId = userId(user);
  const isAdmin = !!currentUserId && (conversation.admins || []).some((id) => id === currentUserId);

  useEffect(() => {
    if (addingMember) {
      getFriends().then((res) => {
        if (res.success) setFriends(res.data.friends);
      });
    }
  }, [addingMember]);

  function liveStatus(id: string, fallbackOnline?: boolean, fallbackLastSeen?: string) {
    const live = id ? presence[id] : undefined;
    return {
      isOnline: live?.isOnline ?? fallbackOnline ?? false,
      lastSeen: live?.lastSeen ?? fallbackLastSeen,
    };
  }

  const other = !conversation.isGroup ? otherParticipant(conversation, currentUsername) : undefined;
  const otherStatus = other ? liveStatus(userId(other), other.isOnline, other.lastSeen) : null;

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
    if (!(await confirm(t('profile.confirmLeave')))) return;
    const res = await leaveGroup(conversation._id);
    if (!res.success) setError(res.error);
  }

  async function handleDelete() {
    if (!(await confirm(t('profile.confirmDelete')))) return;
    const res = await deleteConversation(conversation._id);
    if (!res.success) return setError(res.error);
    onClose();
  }

  const availableFriends = friends.filter(
    (f) => !conversation.participants.some((p) => p.username === f.username)
  );

  return (
    <div className="fixed inset-0 z-30 flex h-full w-full shrink-0 flex-col border-l border-(--border) bg-(--bg-app) md:static md:z-auto md:w-80">
      <PanelHeader>
        <Button variant="iconSm" onClick={onClose} aria-label={t('common.cancel')}>
          <IconX size={20} />
        </Button>
        <p className="font-medium text-(--text-normal)">
          {conversation.isGroup ? t('profile.groupInfo') : t('profile.contactInfo')}
        </p>
      </PanelHeader>

      <div className="flex flex-col items-center gap-2 border-b border-(--border) px-4 py-8">
        <Avatar
          name={conversation.isGroup ? conversation.name : other ? fullName(other) : '?'}
          isOnline={!conversation.isGroup && otherStatus?.isOnline}
          size={96}
          user={other}
        />
        {conversation.isGroup ? (
          renaming ? (
            <div className="flex items-center gap-2">
              <Input
                variant="inline"
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
              <Button variant="textBrand" onClick={handleRename} aria-label={t('common.save')}>
                <IconCheck size={18} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-medium text-(--text-normal)">{conversation.name}</p>
              {isAdmin && (
                <Button
                  variant="text"
                  onClick={() => {
                    setNameDraft(conversation.name);
                    setRenaming(true);
                  }}
                  aria-label={t('chat.edit')}
                >
                  <IconPencil size={16} />
                </Button>
              )}
            </div>
          )
        ) : (
          <p className="text-lg font-medium text-(--text-normal)">{other ? fullName(other) : ''}</p>
        )}
        {!conversation.isGroup && other && (
          <>
            <p className="text-sm text-(--text-muted)">@{other.username}</p>
            <p className="text-xs text-(--text-muted)">
              {otherStatus?.isOnline
                ? t('profile.online')
                : formatLastSeen(otherStatus?.lastSeen) || t('profile.offline')}
            </p>
          </>
        )}
      </div>

      {conversation.isGroup && (
        <>
          {error && <FormError className="px-4 pt-3">{error}</FormError>}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeading>
                {t('profile.membersCount', { count: conversation.participants.length })}
              </SectionHeading>
              {isAdmin && (
                <Button variant="linkXsIcon" onClick={() => setAddingMember((v) => !v)}>
                  <IconUserPlus size={14} /> {t('profile.add')}
                </Button>
              )}
            </div>

            {addingMember && (
              <div className="mb-3 rounded-md bg-(--bg-surface) p-2">
                {availableFriends.length === 0 && (
                  <EmptyState size="xs" className="p-2">
                    {t('profile.noFriendsToAdd')}
                  </EmptyState>
                )}
                {availableFriends.map((f) => (
                  <Button
                    key={f.username}
                    variant="rowItem"
                    onClick={() => handleAddMember(f.username)}
                  >
                    <Avatar name={fullName(f)} size={24} user={f} />
                    {fullName(f)}
                  </Button>
                ))}
              </div>
            )}

            {conversation.participants.map((p) => {
              const status = liveStatus(userId(p), p.isOnline, p.lastSeen);
              return (
                <div key={p.username} className="flex items-center gap-3 py-2">
                  <Avatar name={fullName(p)} isOnline={status.isOnline} size={36} user={p} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-(--text-normal)">
                      {fullName(p)}{' '}
                      {p.username === currentUsername && (
                        <span className="text-(--text-muted)">{t('common.you')}</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-(--text-muted)">@{p.username}</p>
                  </div>
                  {isAdmin && p.username !== currentUsername && (
                    <Button
                      variant="iconDangerSm"
                      onClick={() => handleRemoveMember(p.username)}
                      title={t('profile.removeFromGroup')}
                      aria-label={t('profile.removeFromGroup')}
                    >
                      <IconUserMinus size={16} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-(--border) p-4">
            <Button variant="destructiveBlock" onClick={handleLeave}>
              <IconLogout2 size={18} /> {t('profile.leaveGroup')}
            </Button>
          </div>
        </>
      )}

      <div className="mt-auto border-t border-(--border) p-4">
        <Button variant="destructiveBlock" onClick={handleDelete}>
          <IconTrash size={18} /> {t('profile.deleteChat')}
        </Button>
      </div>

      {confirmDialog}
    </div>
  );
}
