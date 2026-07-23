'use client';

import { IconArrowLeft, IconSearch } from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { t } from '@/i18n';

/** Conversation header: identity, presence/typing subline, search toggle. */
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
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
      {onBack && (
        <button onClick={onBack} className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] md:hidden">
          <IconArrowLeft size={20} />
        </button>
      )}
      <button onClick={onOpenProfile} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar name={title} isOnline={isOnline} size={40} />
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--text-normal)]">{title}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </button>
      <button
        onClick={onToggleSearch}
        className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
        title={t('chat.searchInConversation')}
      >
        <IconSearch size={20} />
      </button>
    </div>
  );
}
