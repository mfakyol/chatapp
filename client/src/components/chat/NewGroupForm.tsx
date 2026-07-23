'use client';

import { useState } from 'react';
import { Conversation, PublicUser } from '@/types';
import { createGroupConversation } from '@/services/conversation.service';
import { fullName } from '@/lib/utils';
import { t } from '@/i18n';

/** Group creation form: name + friend selection. */
export function NewGroupForm({
  friends,
  onCreated,
}: {
  friends: PublicUser[];
  onCreated: (conversation: Conversation) => void;
}) {
  const [name, setName] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [error, setError] = useState('');

  function toggleMember(username: string) {
    setSelection((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  }

  async function handleCreate() {
    setError('');
    if (!name.trim() || selection.length < 2) {
      setError(t('sidebar.errGroupRequirements'));
      return;
    }
    const res = await createGroupConversation(name.trim(), selection);
    if (!res.success) return setError(res.error);
    onCreated(res.data.conversation);
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('sidebar.groupNamePlaceholder')}
        className="rounded-md bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none"
      />
      <p className="text-xs text-[var(--text-muted)]">{t('sidebar.groupHint')}</p>
      {friends.map((f) => (
        <label key={f.username} className="flex items-center gap-2 text-sm text-[var(--text-normal)]">
          <input
            type="checkbox"
            checked={selection.includes(f.username)}
            onChange={() => toggleMember(f.username)}
          />
          {fullName(f)} <span className="text-[var(--text-muted)]">@{f.username}</span>
        </label>
      ))}
      <button
        onClick={handleCreate}
        className="mt-2 rounded-md bg-[var(--brand)] py-2 text-sm font-medium text-[var(--brand-text)]"
      >
        {t('sidebar.createGroup')}
      </button>
    </div>
  );
}
