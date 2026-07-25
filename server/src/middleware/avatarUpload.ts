import crypto from 'crypto';
import multer from 'multer';
import {
  UPLOADS_DIR,
  isBlockedOriginalExtension,
  normalizeMime,
  safeExtensionForMime,
} from '../utils/attachments';

const AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = safeExtensionForMime(file.mimetype);
    if (!ext) return cb(new Error('Unsupported file type'), '');
    const uniqueName = `avatar-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isBlockedOriginalExtension(file.originalname)) {
      return cb(new Error('Unsupported file type'));
    }
    const mime = normalizeMime(file.mimetype);
    if (!mime || !AVATAR_MIMES.has(mime)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  },
});
