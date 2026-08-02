import type { RequestHandler } from 'express';
import { validateUploadedFile } from '../utils/attachments';

export const validateUpload: RequestHandler = async (req, res, next) => {
  const files = req.files as Express.Multer.File[] | undefined;
  const all = files ?? (req.file ? [req.file] : []);
  if (all.length === 0) return next();
  try {
    for (const file of all) {
      await validateUploadedFile(file.path, file.mimetype);
    }
    next();
  } catch (err) {
    next(err);
  }
};
