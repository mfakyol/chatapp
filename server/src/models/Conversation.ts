import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';

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

// Cascade: deleting a conversation removes its messages and memberships.
conversationSchema.pre('deleteOne', { document: true, query: false }, async function cascade() {
  await Promise.all([
    mongoose.model('Message').deleteMany({ conversation: this._id }),
    mongoose.model('ConversationMember').deleteMany({ conversation: this._id }),
  ]);
});

conversationSchema.pre('findOneAndDelete', async function cascade() {
  const doc = await this.model.findOne(this.getFilter()).select('_id');
  if (doc) {
    await Promise.all([
      mongoose.model('Message').deleteMany({ conversation: doc._id }),
      mongoose.model('ConversationMember').deleteMany({ conversation: doc._id }),
    ]);
  }
});

const Conversation = mongoose.model<IConversation, ConversationModel>(
  'Conversation',
  conversationSchema
);

export default Conversation;
