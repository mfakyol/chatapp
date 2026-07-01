const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, default: '' },
    attachment: {
      url: { type: String },
      fileName: { type: String },
      mimeType: { type: String },
      size: { type: Number },
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function requireContentOrAttachment(next) {
  if (!this.deletedAt && !this.content?.trim() && !this.attachment?.url) {
    return next(new Error('Message must have content or an attachment'));
  }
  next();
});

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
