'use client';

import { useEffect, useRef, useState } from 'react';
import {
  IconArrowBackUp,
  IconMoodSmile,
  IconPaperclip,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { Message } from '@/types';
import { getSocket } from '@/lib/socket';
import { sendAttachment } from '@/services/conversation.service';
import { messagePreview } from '@/lib/format';
import { useDismiss } from '@/hooks/useDismiss';
import { t } from '@/i18n';

const EMOJIS = [
  '😀', '😂', '😍', '😊', '😉', '😎', '🤔', '😢', '😭', '😡',
  '👍', '👎', '👏', '🙏', '💪', '🎉', '❤️', '🔥', '✨', '💯',
  '😴', '😅', '🙌', '🤝', '👋', '🤷', '😱', '🥳', '🤩', '😇',
];

const MAX_FILE_BYTES = 10 * 1024 * 1024; // keep in sync with the server's Multer limit

const ACCEPTED_FILES =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z';

/**
 * Message composer: draft + typing signals, emoji picker, attachment upload,
 * reply preview. Owns its own keystroke state so typing never re-renders the
 * message list; remounted per conversation via the parent's key.
 */
export function Composer({
  conversationId,
  replyingTo,
  onCancelReply,
  onSend,
}: {
  conversationId: string;
  replyingTo: Message | null;
  onCancelReply: () => void;
  /** Returns false when the send failed — the draft is restored. */
  onSend: (content: string, replyToId?: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const uploadErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDismiss(showEmoji, () => setShowEmoji(false));

  function stopTyping() {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      getSocket()?.emit('typing:stop', { conversationId });
      isTypingRef.current = false;
    }
  }

  // Cut the typing signal when the composer unmounts (conversation switch).
  useEffect(() => {
    return stopTyping;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Picking a message to reply to focuses the input.
  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  function handleDraftChange(value: string) {
    setDraft(value);
    const socket = getSocket();
    if (!isTypingRef.current) {
      socket?.emit('typing:start', { conversationId });
      isTypingRef.current = true;
    }
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = setTimeout(stopTyping, 2000);
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    stopTyping();
    setDraft('');
    const ok = await onSend(content, replyingTo?._id);
    if (!ok) setDraft(content);
  }

  function handleEmojiPick(emoji: string) {
    setDraft((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  function showUploadError(message: string) {
    setUploadError(message);
    if (uploadErrorTimerRef.current) clearTimeout(uploadErrorTimerRef.current);
    uploadErrorTimerRef.current = setTimeout(() => setUploadError(''), 5000);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Pre-check the server's limit — don't upload 50MB just to get a 400 back.
    if (file.size > MAX_FILE_BYTES) {
      showUploadError(t('chat.fileTooLarge', { max: '10 MB' }));
      return;
    }

    setUploading(true);
    const res = await sendAttachment(conversationId, file);
    if (!res.success) showUploadError(t('chat.uploadFailed', { error: res.error }));
    setUploading(false);
  }

  return (
    <>
      {replyingTo && (
        <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-surface)] px-4 pt-2">
          <IconArrowBackUp size={16} className="shrink-0 text-[var(--brand)]" />
          <div className="min-w-0 flex-1 border-l-2 border-[var(--brand)] pl-2">
            <p className="text-xs font-semibold text-[var(--brand)]">
              {t('chat.replyingTo', {
                name: replyingTo.sender.firstName || replyingTo.sender.username,
              })}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">{messagePreview(replyingTo)}</p>
          </div>
          <button
            onClick={onCancelReply}
            title={t('common.cancel')}
            aria-label={t('common.cancel')}
            className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-surface)] px-4 pt-2">
          <p className="text-xs text-[var(--danger)]">{uploadError}</p>
        </div>
      )}

      <div className="relative flex items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
        {showEmoji && (
          <div
            data-dismiss-root
            className="absolute bottom-full left-4 mb-2 grid grid-cols-6 gap-1 rounded-md bg-[var(--bg-surface)] p-2 shadow-lg"
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiPick(emoji)}
                className="rounded p-1 text-xl hover:bg-[var(--bg-hover)]"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_FILES}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={t('chat.attachFile')}
          aria-label={t('chat.attachFile')}
          className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <IconPaperclip size={20} />
        </button>
        <button
          data-dismiss-root
          onClick={() => setShowEmoji((v) => !v)}
          title={t('chat.emoji')}
          aria-label={t('chat.emoji')}
          className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
        >
          <IconMoodSmile size={20} />
        </button>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
            if (e.key === 'Escape' && replyingTo) onCancelReply();
          }}
          placeholder={uploading ? t('chat.uploading') : t('chat.typeMessage')}
          className="flex-1 rounded-full bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-normal)] placeholder-[var(--text-muted)] outline-none"
        />
        <button
          onClick={handleSend}
          aria-label={t('chat.send')}
          className="rounded-full bg-[var(--brand)] p-2.5 text-[var(--brand-text)] hover:bg-[var(--brand-hover)]"
        >
          <IconSend size={18} />
        </button>
      </div>
    </>
  );
}
