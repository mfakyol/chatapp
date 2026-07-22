import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';

/**
 * One document per (conversation, user). This is the single source of truth for
 * membership: "who receives this event" is resolved from here at send time, and
 * all per-member state lives here.
 *
 * `lastReadAt` is the read pointer (WhatsApp/Discord model): marking a
 * conversation read is a single-field update, unread count is a range count,
 * and a message is "seen" by a member iff member.lastReadAt >= message.createdAt.
 */
export interface IConversationMember {
  conversation: Types.ObjectId;
  user: Types.ObjectId;
  role: 'admin' | 'member';
  lastReadAt: Date;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationMemberModel = Model<IConversationMember>;
export type ConversationMemberDocument = HydratedDocument<IConversationMember>;

const memberSchema = new Schema<IConversationMember, ConversationMemberModel>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    lastReadAt: { type: Date, default: () => new Date(0) },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

memberSchema.index({ conversation: 1, user: 1 }, { unique: true });
memberSchema.index({ user: 1 });

const ConversationMember = mongoose.model<IConversationMember, ConversationMemberModel>(
  'ConversationMember',
  memberSchema
);

export default ConversationMember;
