'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

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
      setError('Username must be 3-20 chars: lowercase letters, numbers, - and _ only');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register({ ...form, username });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#111b21] px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-[#202c33] p-8 shadow-xl">
        <h1 className="mb-6 text-center text-2xl font-semibold text-[#e9edef]">Create account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input
              className="w-1/2 rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
            />
            <input
              className="w-1/2 rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              required
            />
          </div>
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder="Username"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
          <input
            className="rounded-md bg-[#2a3942] px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] outline-none focus:ring-2 focus:ring-[#00a884]"
            placeholder="Password"
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
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#8696a0]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00a884] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
