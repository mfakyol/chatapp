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

export function formatListTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date >= startOfToday) {
    return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  if (now.getTime() - date.getTime() < 7 * DAY_MS) {
    return date.toLocaleDateString("tr-TR", { weekday: "short" });
  }
  return date.toLocaleDateString("tr-TR");
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
