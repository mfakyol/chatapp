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

// Read state is NOT on messages: each member carries a lastReadAt pointer
// (Conversation.members); a message is seen by a member iff
// member.lastReadAt >= message.createdAt.
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
  /** Local-only: optimistic message not yet confirmed by the server. */
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

export interface MessageSearchResult extends Omit<Message, 'conversation'> {
  conversation: { _id: string; name: string; type?: string; isGroup?: boolean };
}

export interface FriendRequests {
  received: PublicUser[];
  sent: PublicUser[];
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
