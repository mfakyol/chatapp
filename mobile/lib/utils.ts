import { SERVER_ORIGIN, apiUrl } from "@/lib/api";
import type { Attachment, Conversation, PublicUser } from "@/types";

export function fileUrl(path: string): string {
  return `${SERVER_ORIGIN}${path}`;
}

export function isImageAttachment(attachment?: Attachment): boolean {
  return attachment?.mimeType.startsWith("image/") ?? false;
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
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
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
  if (days === 1) return "dün";
  if (days < 7) return date.toLocaleDateString("tr-TR", { weekday: "short" });
  if (days < 30) return `${Math.floor(days / 7)} hf`;
  if (days < 365) return `${Math.floor(days / 30)} ay`;
  return `${Math.floor(days / 365)} yıl`;
}

export function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const days = daysAgo(date, now);

  if (days <= 0) return `bugün ${timeOf(date)}`;
  if (days === 1) return `dün ${timeOf(date)}`;
  if (days < 7) {
    return `${date.toLocaleDateString("tr-TR", { weekday: "long" })} ${timeOf(date)}`;
  }
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
