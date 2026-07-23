import { Message } from '@/types';
import { t } from '@/i18n';

/** WhatsApp-style day label: Today / Yesterday / date (year only if not this year). */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return t('chat.today');
  if (diffDays === 1) return t('chat.yesterday');
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

/** One-line preview of a message (reply quotes, sidebar, notifications). */
export function messagePreview(m: Message): string {
  if (m.deletedAt) return t('chat.messageDeleted');
  if (m.attachment) return `📎 ${m.attachment.fileName}`;
  return m.content;
}
