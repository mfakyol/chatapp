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

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface FriendRequests {
  received: PublicUser[];
  sent: PublicUser[];
}

export interface Attachment {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  users: string[];
}

export interface Message {
  _id: string;
  conversation: string;
  sender: PublicUser;
  content: string;
  attachment?: Attachment;
  reactions?: Reaction[];
  replyTo?: Message | null;
  clientTempId?: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  pending?: boolean;
}

export interface ConversationMemberInfo {
  user: PublicUser;
  role: 'admin' | 'member';
  lastReadAt: string;
}

export interface Conversation {
  _id: string;
  isGroup: boolean;
  name: string;
  participants: PublicUser[];
  admins?: string[];
  members?: ConversationMemberInfo[];
  createdBy?: string;
  lastMessage?: Message | null;
  unreadCount?: number;
  updatedAt: string;
}
