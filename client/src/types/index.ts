export interface PublicUser {
  id?: string;
  _id?: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface ReadReceipt {
  user: PublicUser;
  readAt: string;
}

export interface Attachment {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: PublicUser;
  content: string;
  attachment?: Attachment;
  createdAt: string;
  readBy: ReadReceipt[];
  editedAt?: string;
  deletedAt?: string;
}

export interface Conversation {
  _id: string;
  isGroup: boolean;
  name: string;
  participants: PublicUser[];
  admins?: string[];
  createdBy?: string;
  lastMessage?: Message | null;
  unreadCount?: number;
  updatedAt: string;
}

export interface MessageSearchResult extends Omit<Message, 'conversation'> {
  conversation: { _id: string; name: string; isGroup: boolean; participants: PublicUser[] };
}

export interface FriendRequests {
  received: PublicUser[];
  sent: PublicUser[];
}
