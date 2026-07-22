import mongoose, { Schema, Types, HydratedDocument, Model } from 'mongoose';

/**
 * One document per user pair. `userA`/`userB` are always stored in sorted order
 * (smaller ObjectId first) so the unique compound index makes a duplicate or
 * reversed-direction request structurally impossible. State transitions are
 * single-document atomic updates — no cross-document race conditions.
 */
export interface IFriendship {
  userA: Types.ObjectId;
  userB: Types.ObjectId;
  requestedBy: Types.ObjectId;
  status: 'pending' | 'accepted';
  createdAt: Date;
  updatedAt: Date;
}

export type FriendshipModel = Model<IFriendship>;
export type FriendshipDocument = HydratedDocument<IFriendship>;

const friendshipSchema = new Schema<IFriendship, FriendshipModel>(
  {
    userA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted'], required: true },
  },
  { timestamps: true }
);

friendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });
friendshipSchema.index({ userB: 1, status: 1 });
friendshipSchema.index({ userA: 1, status: 1 });

/** Canonical (sorted) pair for a friendship lookup/insert. */
export function sortedPair(
  a: Types.ObjectId,
  b: Types.ObjectId
): { userA: Types.ObjectId; userB: Types.ObjectId } {
  return a.toString() < b.toString() ? { userA: a, userB: b } : { userA: b, userB: a };
}

const Friendship = mongoose.model<IFriendship, FriendshipModel>('Friendship', friendshipSchema);

export default Friendship;
