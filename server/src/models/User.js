const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [USERNAME_REGEX, 'Username can only contain lowercase letters, numbers, - and _'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    avatarUrl: this.avatarUrl,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.USERNAME_REGEX = USERNAME_REGEX;
