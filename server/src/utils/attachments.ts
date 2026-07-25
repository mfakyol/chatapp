import fs from 'fs/promises';
import path from 'path';

export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

export const MIME_ALIASES: Record<string, string> = {
  'application/x-zip-compressed': 'application/zip',
  'application/x-rar-compressed': 'application/vnd.rar',
};

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

const MIME_WITHOUT_MAGIC = new Set(['text/plain', 'text/csv']);

const COMPATIBLE_WITH_DETECTED: Record<string, readonly string[]> = {
  'application/zip': [
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  'application/x-ole': [
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
  ],
  'video/mp4': ['video/mp4', 'audio/mp4', 'video/quicktime'],
  'video/webm': ['video/webm', 'audio/webm'],
};

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

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const OLE_SIG = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const SEVEN_Z_SIG = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);

async function readFileHead(filePath: string, len = 4100): Promise<Buffer> {
  const fh = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(len);
    const { bytesRead } = await fh.read(buf, 0, len, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

function detectMimeFromBuffer(buf: Buffer): string | undefined {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  const head6 = buf.subarray(0, 6).toString('ascii');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'image/gif';

  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';

  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) return 'application/zip';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(OLE_SIG)) return 'application/x-ole';
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'Rar!') return 'application/vnd.rar';
  if (buf.length >= 6 && buf.subarray(0, 6).equals(SEVEN_Z_SIG)) return 'application/x-7z-compressed';

  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return 'video/webm';
  }
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'OggS') return 'audio/ogg';

  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    return 'audio/wav';
  }

  if (buf.length >= 3 && buf.subarray(0, 3).toString('ascii') === 'ID3') return 'audio/mpeg';
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'audio/mpeg';

  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand.startsWith('M4A') || brand.startsWith('M4B')) return 'audio/mp4';
    if (brand.startsWith('qt')) return 'video/quicktime';
    return 'video/mp4';
  }

  return undefined;
}

function mimeMatchesDetected(claimed: string, detected: string): boolean {
  if (claimed === detected) return true;
  const compatible = COMPATIBLE_WITH_DETECTED[detected];
  return compatible?.includes(claimed) ?? false;
}
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

export function attachmentUrl(filename: string): string {
  return `/api/attachments/${filename}`;
}

const SAFE_FILENAME = /^[\w.-]+$/;

export function assertSafeFilename(filename: string): void {
  if (!SAFE_FILENAME.test(filename) || filename.includes('..')) {
    throw new Error('Invalid filename');
  }
}

export async function removeAttachmentFileByUrl(url: string | undefined): Promise<void> {
  if (!url) return;
  const filename = path.posix.basename(url);
  try {
    assertSafeFilename(filename);
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    void 0;
  }
}

export async function validateUploadedFile(filePath: string, claimedMime: string): Promise<void> {
  const canonical = normalizeMime(claimedMime);
  if (!canonical) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error('Unsupported file type');
  }

  const head = await readFileHead(filePath);
  const detected = detectMimeFromBuffer(head);
  if (detected) {
    if (!mimeMatchesDetected(canonical, detected)) {
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
