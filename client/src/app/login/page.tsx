'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/i18n';

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
    <div className="flex flex-1 items-center justify-center bg-[#111b21] px-4">
      <div className="w-full max-w-sm rounded-lg bg-[#202c33] p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[#e9edef]">{t('login.title')}</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder={t('login.identifier')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder={t('login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-[#00a884] py-2.5 font-medium text-[#111b21] transition hover:bg-[#06cf9c] disabled:opacity-60"
          >
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#8696a0]">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="text-[#00a884] hover:underline">
            {t('login.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
