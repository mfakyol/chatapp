import { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

export function UserRow({
  name,
  username,
  avatarSize = 32,
  isOnline,
  actions,
  className,
}: {
  name: string;
  username: string;
  avatarSize?: number;
  isOnline?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={name} size={avatarSize} isOnline={isOnline} />
        <div className="min-w-0">
          <p className="truncate text-sm text-(--text-normal)">{name}</p>
          <p className="truncate text-xs text-(--text-muted)">@{username}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}
