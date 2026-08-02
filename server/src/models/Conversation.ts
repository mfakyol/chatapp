import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';
import { removeAttachmentFileByUrl } from '../utils/attachments';

export interface IConversation {
  type: 'direct' | 'group';
  name: string;
  description: string;
  avatarUrl: string;
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
    description: { type: String, trim: true, default: '', maxlength: 500 },
    avatarUrl: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    directKey: { type: String },
  },
  { timestamps: true }
);

conversationSchema.index({ directKey: 1 }, { unique: true, sparse: true });

export function directKeyFor(a: Types.ObjectId, b: Types.ObjectId): string {
  return [a.toString(), b.toString()].sort().join(':');
}

async function cascadeDelete(conversationId: Types.ObjectId): Promise<void> {
  const withFiles = await mongoose
    .model('Message')
    .find({
      conversation: conversationId,
      $or: [{ 'attachment.url': { $exists: true } }, { 'attachments.0': { $exists: true } }],
    })
    .select('attachment.url attachments.url');
  await Promise.all(
    withFiles.flatMap((m) => {
      const doc = m as { attachment?: { url?: string }; attachments?: { url?: string }[] };
      return [doc.attachment?.url, ...(doc.attachments ?? []).map((a) => a.url)]
        .filter(Boolean)
        .map((url) => removeAttachmentFileByUrl(url));
    })
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
