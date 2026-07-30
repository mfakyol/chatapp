import { request } from "@/lib/api";
import type { Conversation, Message } from "@/types";

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
