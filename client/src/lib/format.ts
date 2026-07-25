import { Message } from "@/types";
import { t } from "@/i18n";
import { getLocaleDefinition } from "@/i18n/locales";
import { getLocale } from "@/contexts/LocaleContext";

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return t("chat.today");
  if (diffDays === 1) return t("chat.yesterday");
  const dateLocale = getLocaleDefinition(getLocale()).dateLocale;
  return d.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== now.getFullYear()
      ? { year: "numeric" as const }
      : {}),
  });
}

export function messagePreview(m: Message): string {
  if (m.deletedAt) return t("chat.messageDeleted");
  if (m.attachment) return `📎 ${m.attachment.fileName}`;
  return m.content;
}

export function formatLastSeen(lastSeen?: string): string {
  if (!lastSeen) return "";
  const date = new Date(lastSeen);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const dateLocale = getLocaleDefinition(getLocale()).dateLocale;
  const time = date.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return t("chat.lastSeenToday", { time });
  const dateStr = date.toLocaleDateString(dateLocale);
  return t("chat.lastSeenDate", { date: dateStr, time });
}
