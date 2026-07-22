'use client';

import Link from 'next/link';
import {
  IconMessages,
  IconBolt,
  IconActivity,
  IconChecks,
  IconPaperclip,
  IconUsersGroup,
  IconShieldLock,
  IconArrowRight,
} from '@tabler/icons-react';
import { useAuth } from '@/hooks/useAuth';
import { t, messages } from '@/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';

const featureIcons = [
  IconBolt,
  IconActivity,
  IconChecks,
  IconPaperclip,
  IconUsersGroup,
  IconShieldLock,
];
const features = featureIcons.map((icon, i) => ({ icon, ...messages.home.features[i] }));

export default function Home() {
  const { user } = useAuth();
  const primaryHref = user ? '/chat' : '/register';
  const primaryLabel = user ? t('home.openChat') : t('home.getStarted');

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-app)] text-[var(--text-normal)]">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-app)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 font-semibold">
            <IconMessages className="h-6 w-6 text-[var(--brand)]" stroke={2} />
            {t('common.brand')}
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {user ? (
              <Link
                href="/chat"
                className="rounded-full bg-[var(--brand)] px-4 py-1.5 text-sm font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)]"
              >
                {t('home.openChat')}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-[var(--text-normal)] transition hover:bg-[var(--bg-hover)]"
                >
                  {t('home.navLogIn')}
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[var(--brand)] px-4 py-1.5 text-sm font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)]"
                >
                  {t('home.navSignUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            <IconBolt className="h-3.5 w-3.5 text-[var(--brand)]" stroke={2} />
            {t('home.heroBadge')}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            {t('home.heroTitleLead')}{' '}
            <span className="text-[var(--brand)]">{t('home.heroTitleEmphasis')}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)] sm:text-base"
            >
              {primaryLabel}
              <IconArrowRight className="h-4 w-4" stroke={2.5} />
            </Link>
            {!user && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-normal)] transition hover:bg-[var(--bg-hover)] sm:text-base"
              >
                {t('home.navLogIn')}
              </Link>
            )}
          </div>
        </div>

        {/* Chat mockup */}
        <div className="mx-auto w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-chat)] shadow-2xl shadow-black/40">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/20 text-sm font-semibold text-[var(--brand)]">
                AY
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium">Ayşe</p>
                <p className="flex items-center gap-1 text-xs text-[var(--brand)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                  online
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-2 px-3 py-4">
              <div className="max-w-[75%] rounded-lg rounded-tl-sm bg-[var(--bg-surface)] px-3 py-2 text-sm">
                Hey! Are we still on for tonight?
                <span className="mt-1 block text-right text-[10px] text-[var(--text-muted)]">
                  20:41
                </span>
              </div>
              <div className="ml-auto max-w-[75%] rounded-lg rounded-tr-sm bg-[var(--bubble-own)] px-3 py-2 text-sm">
                Absolutely 🎉 see you at 8.
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--text-muted)]">
                  20:42
                  <IconChecks className="h-3.5 w-3.5 text-[var(--tick)]" stroke={2} />
                </span>
              </div>
              <div className="ml-auto max-w-[75%] rounded-lg rounded-tr-sm bg-[var(--bubble-own)] px-3 py-2 text-sm">
                Sending the address now 📍
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--text-muted)]">
                  20:42
                  <IconChecks className="h-3.5 w-3.5 text-[var(--tick)]" stroke={2} />
                </span>
              </div>
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 border-t border-[var(--border)] px-3 py-3">
              <IconPaperclip className="h-5 w-5 text-[var(--text-muted)]" stroke={2} />
              <div className="flex-1 rounded-full bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-muted)]">
                Type a message
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-text)]">
                <IconArrowRight className="h-4 w-4" stroke={2.5} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--border)] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            {t('home.featuresTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[var(--text-muted)] sm:text-base">
            {t('home.featuresSubtitle')}
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 transition hover:border-[var(--border)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
                  <f.icon className="h-6 w-6" stroke={2} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-chat)] px-6 py-14 text-center">
          <IconMessages className="mx-auto h-10 w-10 text-[var(--brand)]" stroke={1.75} />
          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
            {t('home.ctaTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--text-muted)] sm:text-base">
            {t('home.ctaSubtitle')}
          </p>
          <Link
            href={primaryHref}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)] sm:text-base"
          >
            {primaryLabel}
            <IconArrowRight className="h-4 w-4" stroke={2.5} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-[var(--text-muted)] sm:flex-row">
          <span className="flex items-center gap-2 font-medium text-[var(--text-normal)]">
            <IconMessages className="h-5 w-5 text-[var(--brand)]" stroke={2} />
            {t('common.brand')}
          </span>
          <span>{t('home.footerTagline')}</span>
        </div>
      </footer>
    </div>
  );
}
