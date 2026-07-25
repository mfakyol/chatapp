import { Conversation, PublicUser } from "@/types";


export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function userId(
  u: Pick<PublicUser, "id" | "_id"> | null | undefined,
): string {
  return u?.id || u?._id || "";
}

export function conversationName(
  conversation: Conversation,
  currentUsername: string,
): string {
  if (conversation.isGroup) return conversation.name || "Unnamed group";
  const other = conversation.participants.find(
    (p) => p.username !== currentUsername,
  );
  return other ? `${other.firstName} ${other.lastName}` : "Unknown";
}

export function otherParticipant(
  conversation: Conversation,
  currentUsername: string,
): PublicUser | undefined {
  return conversation.participants.find((p) => p.username !== currentUsername);
}

export function fullName(user: PublicUser): string {
  return `${user.firstName} ${user.lastName}`;
}

const SERVER_ORIGIN = (
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000"
).replace(/\/$/, "");

export function fileUrl(path: string): string {
  return `${SERVER_ORIGIN}${path}`;
}

export function userAvatarUrl(id: string, avatarUrl?: string): string {
  const base = fileUrl(`/api/users/${id}/avatar`);
  return avatarUrl ? `${base}?v=${encodeURIComponent(avatarUrl)}` : base;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
    oscillator.onended = () => ctx.close();
  } catch {
    
  }
}
