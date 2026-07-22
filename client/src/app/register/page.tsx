'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const username = form.username.toLowerCase();
    if (!USERNAME_REGEX.test(username)) {
      setError(t('register.errBadUsername'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('register.errShortPassword'));
      return;
    }

    setSubmitting(true);
    const res = await register({ ...form, username });
    if (!res.success) setError(res.error);
    setSubmitting(false);
  }

  return (
    <div className="relative flex flex-1 items-center justify-center bg-[var(--bg-app)] px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]" />
      <div className="w-full max-w-sm rounded-lg bg-[var(--bg-surface)] p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[var(--text-normal)]">{t('register.title')}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input
              className="w-1/2 rounded-md bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              placeholder={t('register.firstName')}
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
            />
            <input
              className="w-1/2 rounded-md bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              placeholder={t('register.lastName')}
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              required
            />
          </div>
          <input
            className="rounded-md bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            placeholder={t('register.username')}
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            placeholder={t('register.email')}
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            placeholder={t('register.password')}
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-[var(--brand)] py-2.5 font-medium text-[var(--brand-text)] transition hover:bg-[var(--brand-hover)] disabled:opacity-60"
          >
            {submitting ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          {t('register.haveAccount')}{' '}
          <Link href="/login" className="text-[var(--brand)] hover:underline">
            {t('register.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
