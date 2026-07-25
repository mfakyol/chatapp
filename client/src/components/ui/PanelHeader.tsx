import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PanelHeader({
  children,
  surface = false,
  className,
}: {
  children: ReactNode;
  surface?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-(--border) px-4 py-3',
        surface && 'bg-(--bg-surface)',
        className
      )}
    >
      {children}
    </div>
  );
}
