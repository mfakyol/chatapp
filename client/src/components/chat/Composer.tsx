'use client';

import { useEffect, useRef, useState } from 'react';
import {
  IconArrowBackUp,
  IconMoodSmile,
  IconPaperclip,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { getSocket } from '@/lib/socket';
import { useDraftStore } from '@/stores/draft.store';
import { useChatWindowStore } from '@/stores/chatWindow.store';
import { useChatStore } from '@/stores/chat.store';
import { cancelReply, sendChatMessage } from '@/services/chatWindow.service';
import { sendAttachment } from '@/services/conversation.service';
import { messagePreview } from '@/lib/format';
import { useDismiss } from '@/hooks/useDismiss';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { EmojiPicker } from '@/components/ui/EmojiPicker';

const EMOJIS = [
  '😀', '😂', '😍', '😊', '😉', '😎', '🤔', '😢', '😭', '😡',
  '👍', '👎', '👏', '🙏', '💪', '🎉', '❤️', '🔥', '✨', '💯',
  '😴', '😅', '🙌', '🤝', '👋', '🤷', '😱', '🥳', '🤩', '😇',
];

const MAX_FILE_BYTES = 10 * 1024 * 1024; 

const ACCEPTED_FILES =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z';


export function Composer() {
  const { t } = useT();
  const conversationId = useChatStore((s) => s.activeId);
  const replyingTo = useChatWindowStore((s) => s.replyingTo);

  const [draft, setDraft] = useState(
    () => (conversationId ? useDraftStore.getState().drafts[conversationId] ?? '' : '')
  );
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
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

  
  
  useEffect(() => {
    if (!conversationId) return;
    return () => {
      stopTyping();
      const { setDraft: park, clearDraft } = useDraftStore.getState();
      if (draftRef.current.trim()) park(conversationId, draftRef.current);
      else clearDraft(conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    setDraft(useDraftStore.getState().drafts[conversationId] ?? '');
  }, [conversationId]);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  if (!conversationId) return null;

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!isTypingRef.current) {
      getSocket()?.emit('typing:start', { conversationId });
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
    const ok = await sendChatMessage(content, replyingTo?._id);
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
    if (!conversationId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    
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
        <div className="flex items-center gap-2 border-t border-(--border) bg-(--bg-surface) px-4 pt-2">
          <IconArrowBackUp size={16} className="shrink-0 text-(--brand)" />
          <div className="min-w-0 flex-1 border-l-2 border-(--brand) pl-2">
            <p className="text-xs font-semibold text-(--brand)">
              {t('chat.replyingTo', {
                name: replyingTo.sender.firstName || replyingTo.sender.username,
              })}
            </p>
            <p className="truncate text-xs text-(--text-muted)">{messagePreview(replyingTo)}</p>
          </div>
          <Button
            variant="iconSm"
            onClick={cancelReply}
            title={t('common.cancel')}
            aria-label={t('common.cancel')}
          >
            <IconX size={16} />
          </Button>
        </div>
      )}

      {uploadError && (
        <div className="border-t border-(--border) bg-(--bg-surface) px-4 pt-2">
          <FormError size="xs">{uploadError}</FormError>
        </div>
      )}

      <div className="relative flex items-center gap-2 border-t border-(--border) bg-(--bg-surface) px-4 py-3">
        {showEmoji && (
          <div data-dismiss-root className="absolute bottom-full left-4 mb-2">
            <EmojiPicker emojis={EMOJIS} onPick={handleEmojiPick} />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_FILES}
          onChange={handleFileChange}
        />
        <Button
          variant="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={t('chat.attachFile')}
          aria-label={t('chat.attachFile')}
        >
          <IconPaperclip size={20} />
        </Button>
        <Button
          variant="icon"
          data-dismiss-root
          onClick={() => setShowEmoji((v) => !v)}
          title={t('chat.emoji')}
          aria-label={t('chat.emoji')}
        >
          <IconMoodSmile size={20} />
        </Button>
        <Input
          ref={inputRef}
          variant="pill"
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
            if (e.key === 'Escape' && replyingTo) cancelReply();
          }}
          placeholder={uploading ? t('chat.uploading') : t('chat.typeMessage')}
        />
        <Button variant="iconBrand" onClick={handleSend} aria-label={t('chat.send')}>
          <IconSend size={18} />
        </Button>
      </div>
    </>
  );
}
