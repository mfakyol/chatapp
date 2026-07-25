import { Button } from '@/components/ui/Button';

export function ReplyQuote({
  senderName,
  preview,
  onClick,
}: {
  senderName: string;
  preview: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="unstyled"
      onClick={onClick}
      className="mb-1 flex w-full flex-col items-start rounded border-l-2 border-(--brand) bg-black/10 px-2 py-1 text-left"
    >
      <span className="text-xs font-semibold text-(--brand)">{senderName}</span>
      <span className="max-w-full truncate text-xs opacity-80">{preview}</span>
    </Button>
  );
}
