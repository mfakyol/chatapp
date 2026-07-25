'use client';

import { IconArrowLeft, IconSearch } from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { useT } from '@/hooks/useT';


export function ChatHeader({
  title,
  subtitle,
  isOnline,
  onBack,
  onOpenProfile,
  onToggleSearch,
}: {
  title: string;
  subtitle: string;
  isOnline: boolean;
  onBack?: () => void;
  onOpenProfile: () => void;
  onToggleSearch: () => void;
}) {
  const { t } = useT();
  return (
    <PanelHeader surface>
      {onBack && (
        <Button variant="icon" onClick={onBack} className="md:hidden" aria-label={t('common.cancel')}>
          <IconArrowLeft size={20} />
        </Button>
      )}
      <Button
        variant="unstyled"
        onClick={onOpenProfile}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <Avatar name={title} isOnline={isOnline} size={40} />
        <div className="min-w-0">
          <p className="truncate font-medium text-(--text-normal)">{title}</p>
          <p className="truncate text-xs text-(--text-muted)">{subtitle}</p>
        </div>
      </Button>
      <Button
        variant="icon"
        onClick={onToggleSearch}
        title={t('chat.searchInConversation')}
        aria-label={t('chat.searchInConversation')}
      >
        <IconSearch size={20} />
      </Button>
    </PanelHeader>
  );
}
