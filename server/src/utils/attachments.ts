import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromFile } from 'file-type';

/** Where multer writes uploaded files (shared by upload + serve). */
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

/**
 * Browser-reported MIME aliases mapped to a canonical allowed type. Windows
 * commonly sends zip as application/x-zip-compressed, etc.
 */
export const MIME_ALIASES: Record<string, string> = {
  'application/x-zip-compressed': 'application/zip',
  'application/x-rar-compressed': 'application/vnd.rar',
};

/** Canonical MIME -> safe on-disk extension (never trust originalname). */
export const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.weba',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/vnd.rar': '.rar',
  'application/x-7z-compressed': '.7z',
};

export const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXT));

/** Types we accept without a detectable magic signature (strict allowlist). */
const MIME_WITHOUT_MAGIC = new Set(['text/plain', 'text/csv']);

/** Extensions that must never be stored, even if MIME is spoofed. */
const BLOCKED_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.svg',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.php',
  '.asp',
  '.aspx',
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.wasm',
]);

export function normalizeMime(mime: string): string | undefined {
  const canonical = MIME_ALIASES[mime] ?? mime;
  return ALLOWED_MIME_TYPES.has(canonical) ? canonical : undefined;
}

export function safeExtensionForMime(mime: string): string | undefined {
  const canonical = normalizeMime(mime);
  return canonical ? MIME_TO_EXT[canonical] : undefined;
}

export function isBlockedOriginalExtension(originalName: string): boolean {
  return BLOCKED_EXTENSIONS.has(path.extname(originalName).toLowerCase());
}

/** Public API path stored on messages (auth required to download). */
export function attachmentUrl(filename: string): string {
  return `/api/attachments/${filename}`;
}

const SAFE_FILENAME = /^[\w.-]+$/;

export function assertSafeFilename(filename: string): void {
  if (!SAFE_FILENAME.test(filename) || filename.includes('..')) {
    throw new Error('Invalid filename');
  }
}

/**
 * Best-effort removal of the on-disk file behind an attachment URL. Called when
 * the owning message (or its whole conversation) is deleted, so uploads never
 * leak as orphans. Failures are swallowed — the DB delete must not roll back
 * because a file was already gone.
 */
export async function removeAttachmentFileByUrl(url: string | undefined): Promise<void> {
  if (!url) return;
  const filename = path.posix.basename(url);
  try {
    assertSafeFilename(filename);
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    // already gone or unsafe name — nothing to clean up
  }
}

/**
 * Verify on-disk bytes match an allowed type. Deletes the file and throws when
 * validation fails so callers can return 400 to the uploader.
 */
export async function validateUploadedFile(filePath: string, claimedMime: string): Promise<void> {
  const canonical = normalizeMime(claimedMime);
  if (!canonical) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error('Unsupported file type');
  }

  const detected = await fileTypeFromFile(filePath);
  if (detected) {
    const detectedCanonical = MIME_ALIASES[detected.mime] ?? detected.mime;
    if (!ALLOWED_MIME_TYPES.has(detectedCanonical) || detectedCanonical !== canonical) {
      await fs.unlink(filePath).catch(() => {});
      throw new Error('File content does not match its type');
    }
    return;
  }

  if (!MIME_WITHOUT_MAGIC.has(canonical)) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error('Unsupported file type');
  }
}
