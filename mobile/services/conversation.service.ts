import { apiUrl, request, type Result } from "@/lib/api";
import type { Conversation, Message, Reaction } from "@/types";

export const getConversations = () =>
  request<{ conversations: Conversation[] }>("/conversations");

export const getMessages = (conversationId: string) =>
  request<{ messages: Message[] }>(`/conversations/${conversationId}/messages`);

export const getOlderMessages = (conversationId: string, before: string) =>
  request<{ messages: Message[] }>(
    `/conversations/${conversationId}/messages?before=${encodeURIComponent(before)}`,
  );

export interface SendMessageInput {
  content: string;
  replyTo?: string;
  clientTempId?: string;
}

export const sendMessage = (conversationId: string, input: SendMessageInput) =>
  request<{ message: Message }>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const markRead = (conversationId: string) =>
  request<{ lastReadAt: string }>(`/conversations/${conversationId}/read`, {
    method: "POST",
  });

export const reactToMessage = (
  conversationId: string,
  messageId: string,
  emoji: string,
) =>
  request<{ reactions: Reaction[] }>(
    `/conversations/${conversationId}/messages/${messageId}/reactions`,
    { method: "POST", body: JSON.stringify({ emoji }) },
  );

export const editMessage = (
  conversationId: string,
  messageId: string,
  content: string,
) =>
  request<{ message: Message }>(
    `/conversations/${conversationId}/messages/${messageId}`,
    { method: "PATCH", body: JSON.stringify({ content }) },
  );

export const deleteMessage = (conversationId: string, messageId: string) =>
  request<{ message: string }>(
    `/conversations/${conversationId}/messages/${messageId}`,
    { method: "DELETE" },
  );

export interface AttachmentFile {
  uri: string;
  name: string;
  type: string;
}

export async function sendAttachment(
  conversationId: string,
  file: AttachmentFile,
): Promise<Result<{ message: Message }>> {
  const formData = new FormData();
  formData.append("file", file as unknown as Blob);

  try {
    const res = await fetch(apiUrl(`/conversations/${conversationId}/attachments`), {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || "Failed to upload file" };
    }
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload file",
    };
  }
}
