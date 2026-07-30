import Constants from "expo-constants";

const devHost = Constants.expoConfig?.hostUri?.split(":")[0];

export const SERVER_ORIGIN =
  process.env.EXPO_PUBLIC_SERVER_URL ??
  (devHost ? `http://${devHost}:4000` : "http://localhost:4000");

const API_URL = `${SERVER_ORIGIN}/api`;

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler;
}

const REQUEST_TIMEOUT_MS = 10_000;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    throw err instanceof Error && err.name === "AbortError"
      ? new Error("Server is not reachable")
      : err;
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
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
