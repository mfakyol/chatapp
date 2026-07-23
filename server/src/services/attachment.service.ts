import fs from 'fs/promises';
import path from 'path';
import Message from '../models/Message';
import type { UserDocument } from '../models/User';
import { notFound } from '../errors/AppError';
import { requireMembership } from './conversation.service';
import {
  UPLOADS_DIR,
  assertSafeFilename,
  attachmentUrl,
} from '../utils/attachments';

export interface ServedAttachment {
  filePath: string;
  mimeType: string;
  fileName: string;
}

export async function resolveAttachmentForUser(
  user: UserDocument,
  filename: string
): Promise<ServedAttachment> {
  assertSafeFilename(filename);

  const message = await Message.findOne({
    deletedAt: null,
    'attachment.url': attachmentUrl(filename),
  });
  if (!message?.attachment?.mimeType) throw notFound('Attachment not found');

  await requireMembership(user, message.conversation.toString());

  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    await fs.access(filePath);
  } catch {
    throw notFound('Attachment not found');
  }

  return {
    filePath,
    mimeType: message.attachment.mimeType,
    fileName: message.attachment.fileName ?? filename,
  };
}
