import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'rounded-md bg-(--brand) py-2.5 font-medium text-(--brand-text) transition hover:bg-(--brand-hover) disabled:opacity-60',
  primarySm:
    'rounded-md bg-(--brand) px-4 py-2 text-sm font-medium text-(--brand-text) transition hover:bg-(--brand-hover) disabled:opacity-60',
  danger: 'rounded-md bg-(--danger) px-3 py-1.5 text-sm font-medium text-white',
  ghost:
    'rounded-md px-3 py-1.5 text-sm text-(--text-muted) transition hover:bg-(--bg-hover) disabled:opacity-60',
  icon: 'rounded-full p-2 text-(--text-muted) transition hover:bg-(--bg-hover) disabled:opacity-50',
  iconSm: 'rounded-full p-1 text-(--text-muted) transition hover:bg-(--bg-hover) disabled:opacity-50',
  iconBrand:
    'rounded-full bg-(--brand) p-2.5 text-(--brand-text) transition hover:bg-(--brand-hover) disabled:opacity-50',
  iconAccent: 'rounded-full p-2 text-(--brand) transition hover:bg-(--bg-hover) disabled:opacity-50',
  iconDanger: 'rounded-full p-2 text-(--danger) transition hover:bg-(--bg-hover) disabled:opacity-50',
  iconDangerSm:
    'rounded-full p-1.5 text-(--text-muted) transition hover:bg-(--bg-hover) hover:text-(--danger) disabled:opacity-50',
  floating:
    'rounded-full bg-(--bg-elevated) p-1 text-(--text-normal) shadow transition disabled:opacity-50',
  text: 'text-sm text-(--text-muted) transition disabled:opacity-60',
  textBrand: 'text-sm text-(--brand) transition hover:underline disabled:opacity-60',
  linkXs: 'text-xs text-(--brand) transition hover:underline disabled:opacity-60',
  linkXsIcon: 'flex items-center gap-1 text-xs text-(--brand) transition hover:underline disabled:opacity-60',
  destructiveBlock:
    'flex w-full items-center justify-center gap-2 rounded-md bg-(--bg-elevated) py-2 text-sm text-(--danger) transition hover:bg-(--bg-hover) disabled:opacity-60',
  menuItem:
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--text-normal) transition hover:bg-(--bg-hover) disabled:opacity-60',
  menuItemDanger:
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--danger) transition hover:bg-(--bg-hover) disabled:opacity-60',
  rowItem:
    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-(--text-normal) transition hover:bg-(--bg-hover) disabled:opacity-60',
  emoji: 'rounded-full p-0.5 text-base leading-none transition hover:bg-(--bg-hover) disabled:opacity-50',
  unstyled: '',
} as const;

export type ButtonVariant = keyof typeof variants;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, className, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(variants[variant], loading && 'opacity-60', className)}
      {...props}
    />
  );
});
