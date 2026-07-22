'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await login(identifier, password);
    if (!res.success) setError(res.error);
    setSubmitting(false);
  }

  return (
    <div className="relative flex flex-1 items-center justify-center bg-[var(--bg-app)] px-4">
      <ThemeToggle className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]" />
      <div className="w-full max-w-sm rounded-lg bg-[var(--bg-surface)] p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[var(--text-normal)]">{t('login.title')}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="rounded-md bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            placeholder={t('login.identifier')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            placeholder={t('login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-[var(--brand)] py-2.5 font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
          >
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="text-[var(--brand)] hover:underline">
            {t('login.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
