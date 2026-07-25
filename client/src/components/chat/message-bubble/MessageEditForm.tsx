'use client';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useT } from '@/hooks/useT';

export function MessageEditForm({
  draft,
  onDraftChange,
  onSave,
  onCancel,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();

  return (
    <div className="flex flex-col gap-2">
      <Input
        variant="ghost"
        autoFocus
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
      />
      <div className="flex justify-end gap-2 text-xs">
        <Button variant="text" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="textBrand" onClick={onSave}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
