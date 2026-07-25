import { cn } from '@/lib/cn';

export function FormError({
  children,
  size = 'sm',
  className,
}: {
  children: string;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  return (
    <p className={cn(size === 'xs' ? 'text-xs' : 'text-sm', 'text-(--danger)', className)}>
      {children}
    </p>
  );
}
