import { IconCheck, IconChecks } from '@tabler/icons-react';
import { Message } from '@/types';

export function MessageTicks({ message, currentUsername }: { message: Message; currentUsername: string }) {
  const seenByOthers = message.readBy.some((r) => r.user.username !== currentUsername);

  if (seenByOthers) {
    return <IconChecks size={16} className="text-[var(--tick)]" />;
  }
  return <IconCheck size={16} className="text-[var(--text-muted)]" />;
}
