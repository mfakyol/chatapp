import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';
import { removeAttachmentFileByUrl } from '../utils/attachments';

/**
 * The conversation itself — membership lives in ConversationMember. For direct
 * chats `directKey` is "<idLo>:<idHi>" under a unique sparse index, so creating
 * a direct conversation is a race-proof upsert: a second conversation for the
 * same pair is impossible at the database level.
 */
export interface IConversation {
  type: 'direct' | 'group';
  name: string;
  createdBy?: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  directKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationModel = Model<IConversation>;
export type ConversationDocument = HydratedDocument<IConversation>;

const conversationSchema = new Schema<IConversation, ConversationModel>(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    name: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    directKey: { type: String },
  },
  { timestamps: true }
);

conversationSchema.index({ directKey: 1 }, { unique: true, sparse: true });

/** Canonical direct-conversation key for a user pair. */
export function directKeyFor(a: Types.ObjectId, b: Types.ObjectId): string {
  return [a.toString(), b.toString()].sort().join(':');
}

// Cascade: deleting a conversation removes its messages, memberships AND the
// uploaded files its messages referenced (no orphans left on disk).
async function cascadeDelete(conversationId: Types.ObjectId): Promise<void> {
  const withFiles = await mongoose
    .model('Message')
    .find({ conversation: conversationId, 'attachment.url': { $exists: true } })
    .select('attachment.url');
  await Promise.all(
    withFiles.map((m) =>
      removeAttachmentFileByUrl((m as { attachment?: { url?: string } }).attachment?.url)
    )
  );
  await Promise.all([
    mongoose.model('Message').deleteMany({ conversation: conversationId }),
    mongoose.model('ConversationMember').deleteMany({ conversation: conversationId }),
  ]);
}

conversationSchema.pre('deleteOne', { document: true, query: false }, async function cascade() {
  await cascadeDelete(this._id);
});

conversationSchema.pre('findOneAndDelete', async function cascade() {
  const doc = await this.model.findOne(this.getFilter()).select('_id');
  if (doc) await cascadeDelete(doc._id);
});

const Conversation = mongoose.model<IConversation, ConversationModel>(
  'Conversation',
  conversationSchema
);

export default Conversation;
