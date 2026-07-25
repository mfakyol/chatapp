import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function FormHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-xs text-(--text-muted)', className)}>{children}</p>;
}
