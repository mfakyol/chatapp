import { IconCheck, IconChecks, IconClock } from '@tabler/icons-react';
import { Message } from '@/types';


export function MessageTicks({ message, otherReads }: { message: Message; otherReads: string[] }) {
  if (message.pending) {
    return <IconClock size={14} className="text-(--text-muted)" />;
  }

  const sentAt = new Date(message.createdAt).getTime();
  const seen = otherReads.some((r) => new Date(r).getTime() >= sentAt);

  if (seen) {
    return <IconChecks size={16} className="text-(--tick)" />;
  }
  return <IconCheck size={16} className="text-(--text-muted)" />;
}
