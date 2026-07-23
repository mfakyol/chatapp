import crypto from 'crypto';
import multer from 'multer';
import {
  UPLOADS_DIR,
  isBlockedOriginalExtension,
  normalizeMime,
  safeExtensionForMime,
} from '../utils/attachments';

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = safeExtensionForMime(file.mimetype);
    if (!ext) return cb(new Error('Unsupported file type'), '');
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isBlockedOriginalExtension(file.originalname)) {
      return cb(new Error('Unsupported file type'));
    }
    if (!normalizeMime(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  },
});
