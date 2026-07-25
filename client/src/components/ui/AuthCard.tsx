'use client';

import { IconMessages } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { LocaleLink } from '@/components/LocaleLink';
import { cn } from '@/lib/cn';

export function AuthCard({
  title,
  footer,
  children,
  className,
}: {
  title: string;
  footer: { prompt: string; href: string; link: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'auth-card h-fit w-full shrink-0 px-4 pb-8 pt-2 sm:max-w-[420px] sm:px-10 sm:py-10',
        className
      )}
    >
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-(--brand)/12 text-(--brand)">
          <IconMessages size={26} stroke={2} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-(--text-normal)">{title}</h1>
      </div>

      {children}

      <p className="mt-8 text-center text-sm text-(--text-muted) sm:border-t sm:border-(--border) sm:pt-6">
        {footer.prompt}{' '}
        <LocaleLink
          href={footer.href}
          className="font-medium text-(--brand) transition hover:text-(--brand-hover) hover:underline"
        >
          {footer.link}
        </LocaleLink>
      </p>
    </div>
  );
}
