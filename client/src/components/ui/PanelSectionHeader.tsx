import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PanelSectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      <h3 className="text-sm font-semibold text-(--text-normal)">{title}</h3>
      {action}
    </div>
  );
}
