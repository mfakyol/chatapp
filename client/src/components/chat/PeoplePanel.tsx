'use client';

import { useEffect, useState } from 'react';
import {
  IconCheck,
  IconUserMinus,
  IconUserPlus,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { SearchField } from '@/components/ui/SearchField';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { UserRow } from '@/components/ui/UserRow';
import { PanelSectionHeader } from '@/components/ui/PanelSectionHeader';
import { NewGroupForm } from '@/components/chat/NewGroupForm';
import { Conversation, FriendRequests, PublicUser } from '@/types';
import { searchUsers, sendFriendRequest } from '@/services/user.service';
import { fullName } from '@/lib/utils';
import { useT } from '@/hooks/useT';


export function PeoplePanel({
  friends,
  requests,
  isUserOnline,
  onAccept,
  onDecline,
  onUnfriend,
  onStartChat,
  onConversationCreated,
}: {
  friends: PublicUser[];
  requests: FriendRequests;
  isUserOnline: (user: PublicUser) => boolean;
  onAccept: (username: string) => void;
  onDecline: (username: string) => void;
  onUnfriend: (username: string) => Promise<string | null>;
  onStartChat: (username: string) => Promise<string | null>;
  onConversationCreated: (conversation: Conversation) => void;
}) {
  const { t } = useT();
  const { confirm, confirmDialog } = useConfirm();
  const [groupMode, setGroupMode] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const res = await searchUsers(q);
      if (cancelled) return;
      if (res.success) setResults(res.data.users);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);
  const shownResults = query.trim() ? results : [];

  async function handleAddFriend(username: string) {
    setError('');
    const res = await sendFriendRequest(username);
    if (!res.success) return setError(res.error);
    setResults((prev) => prev.filter((u) => u.username !== username));
  }

  async function handleStartChat(username: string) {
    setError('');
    const err = await onStartChat(username);
    if (err) setError(err);
  }

  async function handleUnfriend(username: string) {
    if (!(await confirm(t('sidebar.confirmUnfriend', { name: username })))) return;
    setError('');
    const err = await onUnfriend(username);
    if (err) setError(err);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {error && <FormError className="mb-3">{error}</FormError>}

      <PanelSectionHeader
        title={groupMode ? t('sidebar.groupHeading') : t('sidebar.searchHeading')}
        action={
          <Button
            variant="linkXsIcon"
            onClick={() => {
              setGroupMode((v) => !v);
              setError('');
            }}
          >
            <IconUsersGroup size={16} /> {groupMode ? t('sidebar.cancel') : t('sidebar.newGroup')}
          </Button>
        }
      />

      {groupMode ? (
        <NewGroupForm friends={friends} onCreated={onConversationCreated} />
      ) : (
        <>
          <SearchField
            wrapperClassName="mb-4"
            value={query}
            onChange={setQuery}
            placeholder={t('sidebar.searchUsername')}
          />

          {query.trim() && (
            <div className="mb-6">
              {shownResults.length === 0 && (
                <EmptyState size="xs">{t('sidebar.noUsersFound')}</EmptyState>
              )}
              {shownResults.map((u) => (
                <UserRow
                  key={u.username}
                  name={fullName(u)}
                  username={u.username}
                  actions={
                    <Button
                      variant="iconAccent"
                      onClick={() => handleAddFriend(u.username)}
                      title={t('sidebar.addFriend')}
                      aria-label={t('sidebar.addFriend')}
                    >
                      <IconUserPlus size={18} />
                    </Button>
                  }
                />
              ))}
            </div>
          )}

          {requests.received.length > 0 && (
            <div className="mb-6">
              <SectionHeading className="mb-2">{t('sidebar.friendRequests')}</SectionHeading>
              {requests.received.map((u) => (
                <UserRow
                  key={u.username}
                  name={fullName(u)}
                  username={u.username}
                  actions={
                    <div className="flex gap-1">
                      <Button variant="iconAccent" onClick={() => onAccept(u.username)} aria-label={t('common.confirm')}>
                        <IconCheck size={18} />
                      </Button>
                      <Button variant="iconDanger" onClick={() => onDecline(u.username)} aria-label={t('common.cancel')}>
                        <IconX size={18} />
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}

          <div>
            <SectionHeading className="mb-2">{t('sidebar.friends')}</SectionHeading>
            {friends.length === 0 && <EmptyState size="xs">{t('sidebar.noFriends')}</EmptyState>}
            {friends.map((f) => (
              <UserRow
                key={f.username}
                name={fullName(f)}
                username={f.username}
                isOnline={isUserOnline(f)}
                actions={
                  <div className="flex items-center gap-1">
                    <Button variant="linkXs" onClick={() => handleStartChat(f.username)}>
                      {t('sidebar.message')}
                    </Button>
                    <Button
                      variant="iconDangerSm"
                      onClick={() => handleUnfriend(f.username)}
                      title={t('sidebar.unfriend')}
                      aria-label={t('sidebar.unfriend')}
                    >
                      <IconUserMinus size={16} />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}

      {confirmDialog}
    </div>
  );
}
