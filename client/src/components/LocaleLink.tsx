'use client';

import Link from 'next/link';
import { ComponentProps } from 'react';
import { useT } from '@/hooks/useT';
import { isLocalizedPath, localizedPath } from '@/i18n/routing';

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const { locale } = useT();
  const resolved = isLocalizedPath(href) ? href : localizedPath(href, locale);
  return <Link href={resolved} {...props} />;
}
