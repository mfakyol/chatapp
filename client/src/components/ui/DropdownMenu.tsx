import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function DropdownMenu({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'absolute z-20 rounded-md bg-(--bg-surface) py-1 text-sm shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}
