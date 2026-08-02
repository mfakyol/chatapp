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

  const url = attachmentUrl(filename);
  const message = await Message.findOne({
    deletedAt: null,
    $or: [{ 'attachment.url': url }, { 'attachments.url': url }],
  });
  const attachment =
    message?.attachment?.url === url
      ? message.attachment
      : message?.attachments?.find((a) => a.url === url);
  if (!attachment?.mimeType || !message) throw notFound('Attachment not found');

  await requireMembership(user, message.conversation.toString());

  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    await fs.access(filePath);
  } catch {
    throw notFound('Attachment not found');
  }

  return {
    filePath,
    mimeType: attachment.mimeType,
    fileName: attachment.fileName ?? filename,
  };
}
