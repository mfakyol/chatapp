import fs from 'fs/promises';
import path from 'path';
import User, { UserDocument } from '../models/User';
import { withPresence } from './friendship.service';
import { notFound } from '../errors/AppError';
import { invalidateUser } from '../utils/userCache';
import {
  UPLOADS_DIR,
  assertSafeFilename,
  normalizeMime,
  validateUploadedFile,
} from '../utils/attachments';

async function deleteAvatarFile(filename: string): Promise<void> {
  if (!filename) return;
  assertSafeFilename(filename);
  if (!filename.startsWith('avatar-')) return;
  try {
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    void 0;
  }
}

export async function updateProfile(user: UserDocument, bio: string) {
  user.bio = bio;
  await user.save();
  invalidateUser(user._id.toString());
  return withPresence(user);
}

export async function setAvatar(user: UserDocument, filePath: string, mime: string) {
  await validateUploadedFile(filePath, mime);
  const filename = path.basename(filePath);
  const previous = user.avatarUrl;
  user.avatarUrl = filename;
  await user.save();
  invalidateUser(user._id.toString());
  if (previous && previous !== filename) await deleteAvatarFile(previous);
  return withPresence(user);
}

export async function resolveAvatar(userId: string) {
  const user = await User.findById(userId);
  if (!user?.avatarUrl) throw notFound('Avatar not found');
  assertSafeFilename(user.avatarUrl);
  const filePath = path.join(UPLOADS_DIR, user.avatarUrl);
  try {
    await fs.access(filePath);
  } catch {
    throw notFound('Avatar not found');
  }
  const mime = normalizeMime(
    user.avatarUrl.endsWith('.png')
      ? 'image/png'
      : user.avatarUrl.endsWith('.webp')
        ? 'image/webp'
        : user.avatarUrl.endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg'
  );
  return {
    filePath,
    mimeType: mime || 'image/jpeg',
  };
}

export async function searchUsers(currentUser: UserDocument, rawQuery: unknown) {
  const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!q) return [];

  const users = await User.find({
    username: { $regex: `^${q.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
    _id: { $ne: currentUser._id },
  }).limit(20);

  return users.map(withPresence);
}
