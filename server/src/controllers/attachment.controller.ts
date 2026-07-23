import type { RequestHandler } from 'express';
import path from 'path';
import { currentUser } from '../middleware/auth';
import { resolveAttachmentForUser } from '../services/attachment.service';

export const serveAttachment: RequestHandler = async (req, res, next) => {
  try {
    const { filePath, mimeType, fileName } = await resolveAttachmentForUser(
      currentUser(req),
      req.params.filename
    );

    const inline = mimeType.startsWith('image/');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${path.basename(fileName)}"`
    );

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};
