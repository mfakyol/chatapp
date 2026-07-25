import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ListRowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  align?: 'center' | 'start';
  children: ReactNode;
}

export const ListRowButton = forwardRef<HTMLButtonElement, ListRowButtonProps>(function ListRowButton(
  { active, align = 'center', className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex w-full gap-3 px-4 py-3 text-left hover:bg-(--bg-hover)',
        align === 'center' ? 'items-center' : 'items-start',
        active && 'bg-(--bg-elevated)',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
