'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';

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
    <div className="flex flex-1 items-center justify-center bg-[#111b21] px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-[#202c33] p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[#e9edef]">{t('register.title')}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input
              className="w-1/2 rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
              placeholder={t('register.firstName')}
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
            />
            <input
              className="w-1/2 rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
              placeholder={t('register.lastName')}
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              required
            />
          </div>
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder={t('register.username')}
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder={t('register.email')}
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder={t('register.password')}
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-[#00a884] py-2.5 font-medium text-[#111b21] transition hover:bg-[#06cf9c] disabled:opacity-60"
          >
            {submitting ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#8696a0]">
          {t('register.haveAccount')}{' '}
          <Link href="/login" className="text-[#00a884] hover:underline">
            {t('register.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
