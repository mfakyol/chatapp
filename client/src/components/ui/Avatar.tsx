import { userAvatarUrl, userId } from '@/lib/utils';

export function Avatar({
  name,
  isOnline,
  size = 44,
  user,
}: {
  name: string;
  isOnline?: boolean;
  size?: number;
  user?: { avatarUrl?: string; id?: string; _id?: string };
}) {
  const id = user ? userId(user) : '';
  const src = user?.avatarUrl && id ? userAvatarUrl(id, user.avatarUrl) : undefined;
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-(--brand) font-medium text-(--brand-text)"
          style={{ fontSize: size / 2.5 }}
        >
          {initials}
        </div>
      )}
      {isOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-(--bg-app) bg-(--online)" />
      )}
    </div>
  );
}
