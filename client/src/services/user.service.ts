import { request } from '@/lib/api';
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
