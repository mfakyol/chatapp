import { IconFile, IconDownload } from '@tabler/icons-react';
import { Attachment } from '@/types';
import { fileUrl, formatFileSize } from '@/lib/utils';

export function MessageAttachment({ attachment }: { attachment: Attachment }) {
  if (attachment.mimeType.startsWith('image/')) {
    return (
      
      <img
        src={fileUrl(attachment.url)}
        alt={attachment.fileName}
        className="mb-1 max-h-60 w-full rounded object-cover"
      />
    );
  }

  return (
    <a
      href={fileUrl(attachment.url)}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-center gap-2 rounded bg-black/20 px-2 py-2 hover:bg-black/30"
    >
      <IconFile size={22} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{attachment.fileName}</p>
        <p className="text-[10px] text-(--text-muted)">{formatFileSize(attachment.size)}</p>
      </div>
      <IconDownload size={16} />
    </a>
  );
}
