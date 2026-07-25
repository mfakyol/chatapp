import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  children,
  size = 'sm',
  padding = 'md',
  className,
}: {
  children: ReactNode;
  size?: 'xs' | 'sm';
  padding?: 'none' | 'md' | 'centered';
  className?: string;
}) {
  return (
    <p
      className={cn(
        size === 'xs' ? 'text-xs' : 'text-sm',
        'text-(--text-muted)',
        padding === 'md' && 'p-4',
        padding === 'centered' && 'text-center',
        className
      )}
    >
      {children}
    </p>
  );
}
