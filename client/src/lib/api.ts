const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function notifyUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(""));
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) notifyUnauthorized();
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<Result<T>> {
  try {
    const data = await apiFetch<T>(path, options);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}
