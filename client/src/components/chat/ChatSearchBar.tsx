'use client';

import { IconSearch, IconX } from '@tabler/icons-react';
import { MessageSearchResult } from '@/types';
import { t } from '@/i18n';

/** In-conversation message search: input + result list. */
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
  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg-app)] p-3">
      <div className="flex items-center gap-2 rounded-md bg-[var(--bg-elevated)] px-3 py-2">
        <IconSearch size={16} className="text-[var(--text-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('chat.searchPlaceholder')}
          className="w-full bg-transparent text-sm text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none"
        />
        <button onClick={onClose} className="text-[var(--text-muted)]">
          <IconX size={16} />
        </button>
      </div>
      {query.trim() && (
        <div className="mt-2 max-h-48 overflow-y-auto">
          {results.length === 0 && (
            <p className="p-2 text-xs text-[var(--text-muted)]">{t('chat.noMessagesFound')}</p>
          )}
          {results.map((m) => (
            <button
              key={m._id}
              onClick={() => onPick(m._id)}
              className="flex w-full flex-col items-start rounded px-2 py-2 text-left hover:bg-[var(--bg-hover)]"
            >
              <span className="text-xs font-medium text-[var(--brand)]">{m.sender.firstName}</span>
              <span className="truncate text-sm text-[var(--text-normal)]">
                {m.attachment ? `📎 ${m.attachment.fileName}` : m.content}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
