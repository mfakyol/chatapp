import { apiUrl, request, type Result } from "@/lib/api";
import type { AttachmentFile } from "@/services/conversation.service";
import type { FriendRequests, PublicUser } from "@/types";

export const searchUsers = (q: string) =>
  request<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(q)}`);

export const getFriends = () =>
  request<{ friends: PublicUser[] }>("/users/friends");

export const getFriendRequests = () =>
  request<FriendRequests>("/users/friend-requests");

export const sendFriendRequest = (username: string) =>
  request<{ message: string }>(`/users/friend-requests/${username}`, {
    method: "POST",
  });

export const acceptFriendRequest = (username: string) =>
  request<{ message: string }>(`/users/friend-requests/${username}/accept`, {
    method: "POST",
  });

export const declineFriendRequest = (username: string) =>
  request<{ message: string }>(`/users/friend-requests/${username}/decline`, {
    method: "POST",
  });

export async function uploadAvatar(
  file: AttachmentFile,
): Promise<Result<{ user: PublicUser }>> {
  const formData = new FormData();
  formData.append("avatar", file as unknown as Blob);

  try {
    const res = await fetch(apiUrl("/users/me/avatar"), {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || "Failed to upload avatar" };
    }
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload avatar",
    };
  }
}
