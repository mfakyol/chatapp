import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function SectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h4 className={cn('text-xs font-semibold uppercase text-(--text-muted)', className)}>
      {children}
    </h4>
  );
}
