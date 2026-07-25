import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { cn } from '@/lib/cn';

export function QuickReactionPicker({
  emojis,
  align,
  onPick,
}: {
  emojis: string[];
  align: 'left' | 'right';
  onPick: (emoji: string) => void;
}) {
  return (
    <EmojiPicker
      layout="row"
      emojis={emojis}
      onPick={onPick}
      className={cn('absolute top-6 z-20', align === 'left' ? 'left-0' : 'right-0')}
    />
  );
}
