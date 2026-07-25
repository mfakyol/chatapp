import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function TabBar({ children }: { children: ReactNode }) {
  return <div className="flex border-b border-(--border)">{children}</div>;
}

export function Tab({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <Button
      type="button"
      variant="unstyled"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium',
        active ? 'border-b-2 border-(--brand) text-(--brand)' : 'text-(--text-muted)'
      )}
    >
      {children}
      {!!badge && (
        <span className="ml-1 rounded-full bg-(--brand) px-1.5 text-xs text-(--brand-text)">
          {badge}
        </span>
      )}
    </Button>
  );
}
