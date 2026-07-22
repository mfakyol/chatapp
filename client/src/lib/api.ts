const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/** Discriminated result so callers handle errors explicitly and type-safely. */
export type Result<T> = { success: true; data: T } | { success: false; error: string };

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

/** Low-level fetch: throws on non-2xx. Prefer {@link request} in services. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data as T;
}

/** Wraps {@link apiFetch} into a {@link Result} instead of throwing. */
export async function request<T>(path: string, options: RequestInit = {}): Promise<Result<T>> {
  try {
    const data = await apiFetch<T>(path, options);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Something went wrong' };
  }
}
