import { IconCheck, IconChecks, IconClock } from '@tabler/icons-react';
import { Message } from '@/types';

/**
 * Ticks derived from members' read pointers: a message is seen by a member iff
 * their lastReadAt >= message.createdAt. `otherReads` is the lastReadAt list of
 * every member except the current user.
 */
export function MessageTicks({ message, otherReads }: { message: Message; otherReads: string[] }) {
  if (message.pending) {
    return <IconClock size={14} className="text-[var(--text-muted)]" />;
  }

  const sentAt = new Date(message.createdAt).getTime();
  const seen = otherReads.some((r) => new Date(r).getTime() >= sentAt);

  if (seen) {
    return <IconChecks size={16} className="text-[var(--tick)]" />;
  }
  return <IconCheck size={16} className="text-[var(--text-muted)]" />;
}
