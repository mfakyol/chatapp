import { cookies } from 'next/headers';
import { cache } from 'react';
import { apiUrl } from '@/lib/api';
import type { PublicUser } from '@/types';

async function cookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
}


export const getServerUser = cache(async (): Promise<PublicUser | null> => {
  const header = await cookieHeader();
  if (!header) return null;

  try {
    const res = await fetch(apiUrl('/auth/me'), {
      headers: { Cookie: header },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { user?: PublicUser };
    return data.user ?? null;
  } catch {
    return null;
  }
});
