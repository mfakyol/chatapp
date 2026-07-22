import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';

export interface IConversation {
  isGroup: boolean;
  name: string;
  participants: Types.Array<Types.ObjectId>;
  admins: Types.Array<Types.ObjectId>;
  createdBy?: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationModel = Model<IConversation>;
export type ConversationDocument = HydratedDocument<IConversation>;

const conversationSchema = new Schema<IConversation, ConversationModel>(
  {
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

// Cascade: deleting a conversation removes its messages so none are orphaned.
// Covers both `doc.deleteOne()` and `Model.findOneAndDelete()`.
conversationSchema.pre('deleteOne', { document: true, query: false }, async function cascade() {
  await mongoose.model('Message').deleteMany({ conversation: this._id });
});

conversationSchema.pre('findOneAndDelete', async function cascade() {
  const doc = await this.model.findOne(this.getFilter()).select('_id');
  if (doc) await mongoose.model('Message').deleteMany({ conversation: doc._id });
});

const Conversation = mongoose.model<IConversation, ConversationModel>(
  'Conversation',
  conversationSchema
);

export default Conversation;
