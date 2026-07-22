import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

export interface PublicUser {
  id: Types.ObjectId;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface IUser {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  friends: Types.Array<Types.ObjectId>;
  friendRequestsSent: Types.Array<Types.ObjectId>;
  friendRequestsReceived: Types.Array<Types.ObjectId>;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  toPublicJSON(): PublicUser;
}

export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
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
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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

userSchema.pre('save', async function hashPassword(this: UserDocument, next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(
  this: UserDocument,
  candidate: string
) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON(this: UserDocument): PublicUser {
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

const User = mongoose.model<IUser, UserModel>('User', userSchema);

export default User;
