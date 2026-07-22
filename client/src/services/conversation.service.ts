import { request, apiUrl, getToken, Result } from '@/lib/api';
import { Conversation, Message, MessageSearchResult } from '@/types';

export const getConversations = () =>
  request<{ conversations: Conversation[] }>('/conversations');

export const getMessages = (conversationId: string, around?: string) =>
  request<{ messages: Message[] }>(
    `/conversations/${conversationId}/messages${around ? `?around=${around}` : ''}`
  );

export const getOlderMessages = (conversationId: string, before: string) =>
  request<{ messages: Message[] }>(
    `/conversations/${conversationId}/messages?before=${encodeURIComponent(before)}`
  );

export const searchMessages = (q: string, conversationId?: string) =>
  request<{ messages: MessageSearchResult[] }>(
    `/conversations/search?q=${encodeURIComponent(q)}${
      conversationId ? `&conversationId=${conversationId}` : ''
    }`
  );

export const editMessage = (conversationId: string, messageId: string, content: string) =>
  request<{ message: Message }>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });

export const deleteMessage = (conversationId: string, messageId: string) =>
  request<{ message: string }>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  });

export const renameGroup = (conversationId: string, name: string) =>
  request<{ conversation: Conversation }>(`/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });

export const addGroupMember = (conversationId: string, username: string) =>
  request<{ conversation: Conversation }>(`/conversations/${conversationId}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export const removeGroupMember = (conversationId: string, username: string) =>
  request<{ conversation: Conversation }>(
    `/conversations/${conversationId}/members/${username}`,
    { method: 'DELETE' }
  );

export const leaveGroup = (conversationId: string) =>
  request<{ message: string }>(`/conversations/${conversationId}/leave`, { method: 'POST' });

export const createDirectConversation = (username: string) =>
  request<{ conversation: Conversation }>('/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export const createGroupConversation = (name: string, usernames: string[]) =>
  request<{ conversation: Conversation }>('/conversations/group', {
    method: 'POST',
    body: JSON.stringify({ name, usernames }),
  });

/** Multipart upload — hand-rolled fetch (not JSON) but returns the same Result shape. */
export async function sendAttachment(
  conversationId: string,
  file: File
): Promise<Result<{ message: Message }>> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(apiUrl(`/conversations/${conversationId}/attachments`), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.message || 'Failed to upload file' };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to upload file' };
  }
}
