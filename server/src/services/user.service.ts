import User, { UserDocument } from '../models/User';
import { withPresence } from './friendship.service';

export async function searchUsers(currentUser: UserDocument, rawQuery: unknown) {
  const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!q) return [];

  const users = await User.find({
    username: { $regex: `^${q.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
    _id: { $ne: currentUser._id },
  }).limit(20);

  return users.map(withPresence);
}
