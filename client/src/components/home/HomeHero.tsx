import { IconArrowRight, IconBolt } from '@tabler/icons-react';
import { ChatMockup } from '@/components/home/ChatMockup';
import type { Translator } from '@/i18n/translate';
import type { PublicUser } from '@/types';
import { LinkButton } from '@/components/ui/LinkButton';

export function HomeHero({ t, user }: { t: Translator; user: PublicUser | null }) {
  const primaryHref = user ? '/chat' : '/register';
  const primaryLabel = user ? t('home.openChat') : t('home.getStarted');

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--bg-chat) px-3 py-1 text-xs font-medium text-(--text-muted)">
          <IconBolt className="h-3.5 w-3.5 text-(--brand)" stroke={2} />
          {t('home.heroBadge')}
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
          {t('home.heroTitleLead')}{' '}
          <span className="text-(--brand)">{t('home.heroTitleEmphasis')}</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-(--text-muted) sm:text-lg">
          {t('home.heroSubtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <LinkButton href={primaryHref} variant="primaryLg" className="inline-flex">
            {primaryLabel}
            <IconArrowRight className="h-4 w-4" stroke={2.5} />
          </LinkButton>
          {!user && (
            <LinkButton href="/login" variant="whiteLg">
              {t('home.navLogIn')}
            </LinkButton>
          )}
        </div>
      </div>
      <ChatMockup t={t} />
    </section>
  );
}
