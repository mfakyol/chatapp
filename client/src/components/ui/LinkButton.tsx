'use client';

import { ReactNode } from 'react';
import { LocaleLink } from '@/components/LocaleLink';
import { cn } from '@/lib/cn';

const primaryBase =
  'inline-flex items-center justify-center gap-2 rounded-full bg-(--brand) font-medium text-(--brand-text) transition hover:bg-(--brand-hover)';

const variants = {
  primary: primaryBase,
  primarySm: cn(primaryBase, 'px-4 py-1.5 text-sm'),
  primaryLg: cn(primaryBase, 'px-6 py-3 text-sm font-semibold sm:text-base'),
  ghost:
    'rounded-full px-4 py-1.5 text-sm font-medium text-(--text-normal) transition hover:bg-(--bg-hover)',
  white:
    'inline-flex items-center justify-center rounded-full border border-(--border) bg-(--bg-chat) px-4 py-1.5 text-sm font-medium text-(--text-normal) transition hover:bg-(--bg-hover)',
  whiteLg:
    'inline-flex items-center justify-center gap-2 rounded-full border border-(--border) bg-(--bg-chat) px-6 py-3 text-sm font-semibold text-(--text-normal) transition hover:bg-(--bg-hover) sm:text-base',
  outline:
    'inline-flex items-center justify-center gap-2 rounded-full border border-(--border) font-semibold text-(--text-normal) transition hover:bg-(--bg-hover) sm:text-base',
  outlineLg: 'rounded-full px-6 py-3 text-sm',
} as const;

export type LinkButtonVariant = keyof typeof variants;

export function LinkButton({
  href,
  variant = 'primary',
  className,
  children,
}: {
  href: string;
  variant?: LinkButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <LocaleLink href={href} className={cn(variants[variant], className)}>
      {children}
    </LocaleLink>
  );
}
