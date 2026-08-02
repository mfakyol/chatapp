import { SERVER_ORIGIN, apiUrl } from "@/lib/api";
import { currentLocale, translate } from "@/lib/i18n";
import type { Attachment, Conversation, Message, PublicUser } from "@/types";

export function fileUrl(path: string): string {
  return `${SERVER_ORIGIN}${path}`;
}

export function isImageAttachment(attachment?: Attachment): boolean {
  return attachment?.mimeType.startsWith("image/") ?? false;
}

export function messageImages(message: Message): Attachment[] {
  if (message.deletedAt) return [];
  if (message.attachments?.length) {
    return message.attachments.filter((a) => isImageAttachment(a));
  }
  return message.attachment && isImageAttachment(message.attachment)
    ? [message.attachment]
    : [];
}

export function userId(user?: PublicUser | null): string {
  return user?.id ?? user?._id ?? "";
}

export function fullName(user?: PublicUser | null): string {
  if (!user) return "";
  return `${user.firstName} ${user.lastName}`.trim();
}

export function userAvatarUrl(user?: PublicUser | null): string | undefined {
  const id = userId(user);
  if (!id || !user?.avatarUrl) return undefined;
  return `${apiUrl(`/users/${id}/avatar`)}?v=${encodeURIComponent(user.avatarUrl)}`;
}

export function groupAvatarUrl(conversation: Conversation): string | undefined {
  if (!conversation.avatarUrl) return undefined;
  return `${apiUrl(`/conversations/${conversation._id}/avatar`)}?v=${encodeURIComponent(conversation.avatarUrl)}`;
}

export function otherParticipant(
  conversation: Conversation,
  meId: string,
): PublicUser | undefined {
  return conversation.participants.find((p) => userId(p) !== meId);
}

export function conversationTitle(
  conversation: Conversation,
  meId: string,
): string {
  if (conversation.isGroup) return conversation.name;
  const other = otherParticipant(conversation, meId);
  return other ? fullName(other) : conversation.name;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function timeOf(d: Date): string {
  return d.toLocaleTimeString(currentLocale(), { hour: "2-digit", minute: "2-digit" });
}

function daysAgo(date: Date, now: Date): number {
  return Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
}

export function formatListTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const days = daysAgo(date, now);

  if (days <= 0) return timeOf(date);
  if (days === 1) return translate("time.yesterdayLower");
  if (days < 7) return date.toLocaleDateString(currentLocale(), { weekday: "short" });
  if (days < 30) return translate("time.weeksShort", { n: Math.floor(days / 7) });
  if (days < 365) return translate("time.monthsShort", { n: Math.floor(days / 30) });
  return translate("time.yearsShort", { n: Math.floor(days / 365) });
}

export function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const days = daysAgo(date, now);

  if (days <= 0) return translate("time.todayAt", { time: timeOf(date) });
  if (days === 1) return translate("time.yesterdayAt", { time: timeOf(date) });
  if (days < 7) {
    return `${date.toLocaleDateString(currentLocale(), { weekday: "long" })} ${timeOf(date)}`;
  }
  if (days < 30) return translate("time.weeksAgo", { n: Math.floor(days / 7) });
  if (days < 365) return translate("time.monthsAgo", { n: Math.floor(days / 30) });
  return translate("time.yearsAgo", { n: Math.floor(days / 365) });
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const days = daysAgo(date, now);

  if (days <= 0) return translate("time.today");
  if (days === 1) return translate("time.yesterday");
  if (days < 7) return date.toLocaleDateString(currentLocale(), { weekday: "long" });
  return date.toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function formatMessageTime(iso: string): string {
  return timeOf(new Date(iso));
}
