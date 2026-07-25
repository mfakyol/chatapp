'use client';

import { MessageSearchResult } from '@/types';
import { useT } from '@/hooks/useT';
import { SearchField } from '@/components/ui/SearchField';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowButton } from '@/components/ui/ListRowButton';


export function ChatSearchBar({
  query,
  results,
  onQueryChange,
  onClose,
  onPick,
}: {
  query: string;
  results: MessageSearchResult[];
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onPick: (messageId: string) => void;
}) {
  const { t } = useT();
  return (
    <div className="border-b border-(--border) bg-(--bg-app) p-3">
      <SearchField
        autoFocus
        value={query}
        onChange={onQueryChange}
        onClear={onClose}
        placeholder={t('chat.searchPlaceholder')}
      />
      {query.trim() && (
        <div className="mt-2 max-h-48 overflow-y-auto">
          {results.length === 0 && (
            <EmptyState size="xs" className="p-2">
              {t('chat.noMessagesFound')}
            </EmptyState>
          )}
          {results.map((m) => (
            <ListRowButton
              key={m._id}
              align="start"
              className="flex-col items-start gap-0 rounded px-2 py-2"
              onClick={() => onPick(m._id)}
            >
              <span className="text-xs font-medium text-(--brand)">{m.sender.firstName}</span>
              <span className="truncate text-sm text-(--text-normal)">
                {m.attachment ? `📎 ${m.attachment.fileName}` : m.content}
              </span>
            </ListRowButton>
          ))}
        </div>
      )}
    </div>
  );
}
