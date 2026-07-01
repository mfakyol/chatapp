import { apiFetch } from '@/lib/api';
import { Conversation, FriendRequests, Message, MessageSearchResult, PublicUser } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const getConversations = () =>
  apiFetch<{ conversations: Conversation[] }>('/conversations');

export const getMessages = (conversationId: string, around?: string) =>
  apiFetch<{ messages: Message[] }>(
    `/conversations/${conversationId}/messages${around ? `?around=${around}` : ''}`
  );

export const getOlderMessages = (conversationId: string, before: string) =>
  apiFetch<{ messages: Message[] }>(
    `/conversations/${conversationId}/messages?before=${encodeURIComponent(before)}`
  );

export const searchMessages = (q: string, conversationId?: string) =>
  apiFetch<{ messages: MessageSearchResult[] }>(
    `/conversations/search?q=${encodeURIComponent(q)}${conversationId ? `&conversationId=${conversationId}` : ''}`
  );

export const editMessage = (conversationId: string, messageId: string, content: string) =>
  apiFetch<{ message: Message }>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });

export const deleteMessage = (conversationId: string, messageId: string) =>
  apiFetch<{ message: string }>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  });

export const renameGroup = (conversationId: string, name: string) =>
  apiFetch<{ conversation: Conversation }>(`/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });

export const addGroupMember = (conversationId: string, username: string) =>
  apiFetch<{ conversation: Conversation }>(`/conversations/${conversationId}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export const removeGroupMember = (conversationId: string, username: string) =>
  apiFetch<{ conversation: Conversation }>(`/conversations/${conversationId}/members/${username}`, {
    method: 'DELETE',
  });

export const leaveGroup = (conversationId: string) =>
  apiFetch<{ message: string }>(`/conversations/${conversationId}/leave`, { method: 'POST' });

export const createDirectConversation = (username: string) =>
  apiFetch<{ conversation: Conversation }>('/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export const createGroupConversation = (name: string, usernames: string[]) =>
  apiFetch<{ conversation: Conversation }>('/conversations/group', {
    method: 'POST',
    body: JSON.stringify({ name, usernames }),
  });

export const searchUsers = (q: string) =>
  apiFetch<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(q)}`);

export const getFriends = () => apiFetch<{ friends: PublicUser[] }>('/users/friends');

export const getFriendRequests = () => apiFetch<FriendRequests>('/users/friend-requests');

export const sendFriendRequest = (username: string) =>
  apiFetch<{ message: string }>(`/users/friend-requests/${username}`, { method: 'POST' });

export const acceptFriendRequest = (username: string) =>
  apiFetch<{ message: string }>(`/users/friend-requests/${username}/accept`, { method: 'POST' });

export const declineFriendRequest = (username: string) =>
  apiFetch<{ message: string }>(`/users/friend-requests/${username}/decline`, { method: 'POST' });

export async function sendAttachment(conversationId: string, file: File): Promise<{ message: Message }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/conversations/${conversationId}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to upload file');
  return data;
}
