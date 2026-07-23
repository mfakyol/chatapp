'use client';

import { IconCheck, IconChecks } from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { Message, PublicUser } from '@/types';
import { fullName, userId } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Read/delivered detail for one of the user's own messages, derived from the
 * per-member read pointers: a member has seen the message iff their
 * lastReadAt >= message.createdAt.
 */
export function MessageInfo({
  message,
  isGroup,
  currentUserId,
  memberReads,
  participants,
}: {
  message: Message;
  isGroup: boolean;
  currentUserId: string;
  memberReads: Record<string, string>;
  participants: PublicUser[];
}) {
  const sentAt = new Date(message.createdAt).toLocaleString();
  const sentTime = new Date(message.createdAt).getTime();

  const others = participants
    .map((p) => ({ user: p, id: userId(p) }))
    .filter(({ id }) => id && id !== currentUserId);
  const readers = others.filter(({ id }) => {
    const at = memberReads[id];
    return !!at && new Date(at).getTime() >= sentTime;
  });
  const deliveredOnly = others.filter((o) => !readers.includes(o));

  return (
    <div className="mt-1 w-56 rounded-md bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-normal)] shadow-lg">
      <p className="text-[var(--text-muted)]">{t('chat.detailSent', { time: sentAt })}</p>

      {isGroup ? (
        <>
          {readers.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1 font-semibold text-[var(--tick)]">
                <IconChecks size={14} /> {t('chat.detailReadBy', { count: readers.length })}
              </p>
              {readers.map(({ user: u, id }) => (
                <div key={u.username} className="flex items-center gap-2 py-1">
                  <Avatar name={fullName(u)} size={20} />
                  <span className="min-w-0 flex-1 truncate">{fullName(u)}</span>
                  <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                    {new Date(memberReads[id]).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </>
          )}
          {deliveredOnly.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1 font-semibold text-[var(--text-muted)]">
                <IconCheck size={14} /> {t('chat.detailDeliveredTo', { count: deliveredOnly.length })}
              </p>
              {deliveredOnly.map(({ user: u }) => (
                <div key={u.username} className="flex items-center gap-2 py-1">
                  <Avatar name={fullName(u)} size={20} />
                  <span className="min-w-0 flex-1 truncate">{fullName(u)}</span>
                </div>
              ))}
            </>
          )}
          {readers.length === 0 && deliveredOnly.length === 0 && (
            <p className="mt-1 text-[var(--text-muted)]">{t('chat.detailNotSeen')}</p>
          )}
        </>
      ) : readers.length > 0 ? (
        <p className="mt-1 flex items-center gap-1">
          <IconChecks size={14} className="text-[var(--tick)]" />
          {t('chat.detailSeen', {
            time: new Date(memberReads[readers[0].id]).toLocaleString(),
          })}
        </p>
      ) : (
        <p className="mt-1 flex items-center gap-1 text-[var(--text-muted)]">
          <IconCheck size={14} /> {t('chat.detailDelivered')}
        </p>
      )}
    </div>
  );
}
