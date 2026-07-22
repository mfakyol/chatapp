import { request } from '@/lib/api';
import { PublicUser, RegisterPayload } from '@/types';

export interface AuthSuccess {
  token: string;
  user: PublicUser;
}

export const me = () => request<{ user: PublicUser }>('/auth/me');

export const login = (identifier: string, password: string) =>
  request<AuthSuccess>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });

export const register = (payload: RegisterPayload) =>
  request<AuthSuccess>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
