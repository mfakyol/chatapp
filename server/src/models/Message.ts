import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';

export interface IAttachment {
  url?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export interface IReadReceipt {
  user: Types.ObjectId;
  readAt: Date;
}

export interface IMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  attachment?: IAttachment;
  readBy: Types.DocumentArray<IReadReceipt>;
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
    readBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
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

const Message = mongoose.model<IMessage, MessageModel>('Message', messageSchema);

export default Message;
