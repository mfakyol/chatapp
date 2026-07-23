import type { RequestHandler } from 'express';
import { validateUploadedFile } from '../utils/attachments';

/** Post-multer guard: verify file bytes, delete and 400 on mismatch. */
export const validateUpload: RequestHandler = async (req, res, next) => {
  if (!req.file) return next();
  try {
    await validateUploadedFile(req.file.path, req.file.mimetype);
    next();
  } catch (err) {
    next(err);
  }
};
