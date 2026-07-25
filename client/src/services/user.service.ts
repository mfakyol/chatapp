import { apiUrl, notifyUnauthorized, request, Result } from '@/lib/api';
import { FriendRequests, PublicUser } from '@/types';

export const searchUsers = (q: string) =>
  request<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(q)}`);

export const getFriends = () => request<{ friends: PublicUser[] }>('/users/friends');

export const getFriendRequests = () => request<FriendRequests>('/users/friend-requests');

export const sendFriendRequest = (username: string) =>
  request<{ message: string }>(`/users/friend-requests/${username}`, { method: 'POST' });

export const acceptFriendRequest = (username: string) =>
  request<{ message: string }>(`/users/friend-requests/${username}/accept`, { method: 'POST' });

export const declineFriendRequest = (username: string) =>
  request<{ message: string }>(`/users/friend-requests/${username}/decline`, { method: 'POST' });

export const removeFriend = (username: string) =>
  request<{ message: string }>(`/users/friends/${username}`, { method: 'DELETE' });

export async function uploadAvatar(file: File): Promise<Result<{ user: PublicUser }>> {
  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetch(apiUrl('/users/me/avatar'), {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) notifyUnauthorized();
      return { success: false, error: data.message || 'Failed to upload avatar' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to upload avatar' };
  }
}
