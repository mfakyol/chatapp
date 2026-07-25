import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';

export interface IAttachment {
  url?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export interface IReaction {
  emoji: string;
  users: Types.Array<Types.ObjectId>;
}

export interface IMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  attachment?: IAttachment;
  replyTo?: Types.ObjectId;
  reactions: Types.DocumentArray<IReaction>;
  clientTempId?: string;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageModel = Model<IMessage>;
export type MessageDocument = HydratedDocument<IMessage>;

const messageSchema = new Schema<IMessage, MessageModel>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, default: '' },
    attachment: {
      url: { type: String },
      fileName: { type: String },
      mimeType: { type: String },
      size: { type: Number },
    },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        _id: false,
      },
    ],
    clientTempId: { type: String },
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function requireContentOrAttachment(this: MessageDocument, next) {
  if (!this.deletedAt && !this.content?.trim() && !this.attachment?.url) {
    return next(new Error('Message must have content or an attachment'));
  }
  next();
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index(
  { sender: 1, clientTempId: 1 },
  { unique: true, partialFilterExpression: { clientTempId: { $exists: true } } }
);

const Message = mongoose.model<IMessage, MessageModel>('Message', messageSchema);

export default Message;
