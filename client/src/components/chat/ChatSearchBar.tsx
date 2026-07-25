'use client';

import { useT } from '@/hooks/useT';
import { closeSearch, jumpToMessage, setSearchQuery } from '@/services/chatWindow.service';
import { useChatWindowStore } from '@/stores/chatWindow.store';
import { SearchField } from '@/components/ui/SearchField';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowButton } from '@/components/ui/ListRowButton';

export function ChatSearchBar() {
  const { t } = useT();
  const showSearch = useChatWindowStore((s) => s.showSearch);
  const searchQuery = useChatWindowStore((s) => s.searchQuery);
  const searchResults = useChatWindowStore((s) => s.searchResults);

  if (!showSearch) return null;

  const results = searchQuery.trim() ? searchResults : [];

  return (
    <div className="border-b border-(--border) bg-(--bg-app) p-3">
      <SearchField
        autoFocus
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={closeSearch}
        placeholder={t('chat.searchPlaceholder')}
      />
      {searchQuery.trim() && (
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
              onClick={() => jumpToMessage(m._id)}
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
