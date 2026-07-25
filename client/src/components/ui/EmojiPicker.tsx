import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function EmojiPicker({
  emojis,
  onPick,
  layout = 'grid',
  className,
}: {
  emojis: string[];
  onPick: (emoji: string) => void;
  layout?: 'grid' | 'row';
  className?: string;
}) {
  if (layout === 'row') {
    return (
      <div
        className={cn(
          'flex gap-1 rounded-full bg-(--bg-surface) px-2 py-1 shadow-lg',
          className
        )}
      >
        {emojis.map((emoji) => (
          <Button key={emoji} variant="emoji" onClick={() => onPick(emoji)}>
            {emoji}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-6 gap-1 rounded-md bg-(--bg-surface) p-2 shadow-lg',
        className
      )}
    >
      {emojis.map((emoji) => (
        <Button key={emoji} variant="emoji" onClick={() => onPick(emoji)} className="text-xl">
          {emoji}
        </Button>
      ))}
    </div>
  );
}
