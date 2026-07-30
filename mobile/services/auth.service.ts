import { request } from "@/lib/api";
import { PublicUser, RegisterPayload } from "@/types";

export const me = () => request<{ user: PublicUser }>("/auth/me");

export const login = (identifier: string, password: string) =>
  request<{ user: PublicUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });

export const register = (payload: RegisterPayload) =>
  request<{ user: PublicUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const logout = () =>
  request<{ message: string }>("/auth/logout", { method: "POST" });
