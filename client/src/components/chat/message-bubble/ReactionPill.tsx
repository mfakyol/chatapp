import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function ReactionPill({
  emoji,
  count,
  active,
  onClick,
}: {
  emoji: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="unstyled"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs',
        active
          ? 'border-(--brand) bg-(--brand)/20 text-(--text-normal)'
          : 'border-(--border) bg-(--bg-surface) text-(--text-muted)'
      )}
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </Button>
  );
}
