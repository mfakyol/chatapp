'use client';

import { useEffect, useState } from 'react';
import {
  IconCheck,
  IconSearch,
  IconUserMinus,
  IconUserPlus,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { NewGroupForm } from '@/components/chat/NewGroupForm';
import { Conversation, FriendRequests, PublicUser } from '@/types';
import { searchUsers, sendFriendRequest } from '@/services/user.service';
import { fullName } from '@/lib/utils';
import { t } from '@/i18n';

/** People tab: user search, friend requests, friends list, group creation. */
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
  const { confirm, confirmDialog } = useConfirm();
  const [groupMode, setGroupMode] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [error, setError] = useState('');

  // Debounced search; the cancelled flag prevents an older response from
  // clobbering a newer query's results (out-of-order race).
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
      {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-normal)]">
          {groupMode ? t('sidebar.groupHeading') : t('sidebar.searchHeading')}
        </h3>
        <button
          onClick={() => {
            setGroupMode((v) => !v);
            setError('');
          }}
          className="flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
        >
          <IconUsersGroup size={16} /> {groupMode ? t('sidebar.cancel') : t('sidebar.newGroup')}
        </button>
      </div>

      {groupMode ? (
        <NewGroupForm friends={friends} onCreated={onConversationCreated} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 rounded-md bg-[var(--bg-elevated)] px-3 py-2">
            <IconSearch size={16} className="text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('sidebar.searchUsername')}
              className="w-full bg-transparent text-sm text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none"
            />
          </div>

          {query.trim() && (
            <div className="mb-6">
              {shownResults.length === 0 && <p className="text-xs text-[var(--text-muted)]">{t('sidebar.noUsersFound')}</p>}
              {shownResults.map((u) => (
                <div key={u.username} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={fullName(u)} size={32} />
                    <div>
                      <p className="text-sm text-[var(--text-normal)]">{fullName(u)}</p>
                      <p className="text-xs text-[var(--text-muted)]">@{u.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddFriend(u.username)}
                    className="rounded-full p-2 text-[var(--brand)] hover:bg-[var(--bg-hover)]"
                    title={t('sidebar.addFriend')}
                  >
                    <IconUserPlus size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {requests.received.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">{t('sidebar.friendRequests')}</h4>
              {requests.received.map((u) => (
                <div key={u.username} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={fullName(u)} size={32} />
                    <div>
                      <p className="text-sm text-[var(--text-normal)]">{fullName(u)}</p>
                      <p className="text-xs text-[var(--text-muted)]">@{u.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onAccept(u.username)}
                      className="rounded-full p-2 text-[var(--brand)] hover:bg-[var(--bg-hover)]"
                    >
                      <IconCheck size={18} />
                    </button>
                    <button
                      onClick={() => onDecline(u.username)}
                      className="rounded-full p-2 text-[var(--danger)] hover:bg-[var(--bg-hover)]"
                    >
                      <IconX size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">{t('sidebar.friends')}</h4>
            {friends.length === 0 && <p className="text-xs text-[var(--text-muted)]">{t('sidebar.noFriends')}</p>}
            {friends.map((f) => (
              <div key={f.username} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Avatar name={fullName(f)} isOnline={isUserOnline(f)} size={32} />
                  <div>
                    <p className="text-sm text-[var(--text-normal)]">{fullName(f)}</p>
                    <p className="text-xs text-[var(--text-muted)]">@{f.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartChat(f.username)}
                    className="text-xs text-[var(--brand)] hover:underline"
                  >
                    {t('sidebar.message')}
                  </button>
                  <button
                    onClick={() => handleUnfriend(f.username)}
                    title={t('sidebar.unfriend')}
                    className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--danger)]"
                  >
                    <IconUserMinus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {confirmDialog}
    </div>
  );
}
