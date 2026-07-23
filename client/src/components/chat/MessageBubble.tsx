'use client';

import {
  IconFile,
  IconDownload,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconInfoCircle,
  IconMoodPlus,
  IconArrowBackUp,
} from '@tabler/icons-react';
import { MessageTicks } from '@/components/chat/MessageTicks';
import { MessageInfo } from '@/components/chat/MessageInfo';
import { Message, PublicUser } from '@/types';
import { fileUrl, formatFileSize } from '@/lib/utils';
import { messagePreview } from '@/lib/format';
import { t } from '@/i18n';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  isGroup: boolean;
  currentUserId: string;
  participants: PublicUser[];
  memberReads: Record<string, string>;
  otherReads: string[];
  highlighted: boolean;
  menuOpen: boolean;
  pickerOpen: boolean;
  detailOpen: boolean;
  editing: boolean;
  editDraft: string;
  /** Registers the bubble root for the scroll/observer machinery of the list. */
  innerRef: (el: HTMLDivElement | null) => void;
  onToggleMenu: () => void;
  onTogglePicker: () => void;
  onToggleDetail: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onJump: (messageId: string) => void;
}

/** One chat message: hover actions, bubble content, ticks, reactions, info. */
export function MessageBubble({
  message: m,
  mine,
  isGroup,
  currentUserId,
  participants,
  memberReads,
  otherReads,
  highlighted,
  menuOpen,
  pickerOpen,
  detailOpen,
  editing,
  editDraft,
  innerRef,
  onToggleMenu,
  onTogglePicker,
  onToggleDetail,
  onStartEdit,
  onCancelEdit,
  onEditDraftChange,
  onSaveEdit,
  onDelete,
  onReact,
  onReply,
  onJump,
}: MessageBubbleProps) {
  const deleted = !!m.deletedAt;

  return (
    <div className={`group mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-xs" data-mid={m._id} ref={innerRef}>
        {mine && !deleted && (
          <div
            data-dismiss-root
            className="absolute -top-2 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <button
              onClick={onToggleMenu}
              aria-label={t('chat.messageMenu')}
              className="rounded-full bg-[var(--bg-elevated)] p-1 text-[var(--text-normal)] shadow"
            >
              <IconDotsVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-20 w-40 rounded-md bg-[var(--bg-surface)] py-1 text-sm shadow-lg">
                <button
                  onClick={onToggleDetail}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-normal)] hover:bg-[var(--bg-hover)]"
                >
                  <IconInfoCircle size={16} /> {t('chat.info')}
                </button>
                {!m.attachment && (
                  <button
                    onClick={onStartEdit}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-normal)] hover:bg-[var(--bg-hover)]"
                  >
                    <IconPencil size={16} /> {t('chat.edit')}
                  </button>
                )}
                <button
                  onClick={onDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--danger)] hover:bg-[var(--bg-hover)]"
                >
                  <IconTrash size={16} /> {t('chat.delete')}
                </button>
              </div>
            )}
          </div>
        )}

        {!deleted && (
          <div
            data-dismiss-root
            className={`absolute -top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${mine ? 'left-1' : 'right-1'}`}
          >
            <button
              onClick={onTogglePicker}
              title={t('chat.react')}
              className="rounded-full bg-[var(--bg-elevated)] p-1 text-[var(--text-normal)] shadow"
            >
              <IconMoodPlus size={14} />
            </button>
            <button
              onClick={onReply}
              title={t('chat.reply')}
              className="rounded-full bg-[var(--bg-elevated)] p-1 text-[var(--text-normal)] shadow"
            >
              <IconArrowBackUp size={14} />
            </button>
            {pickerOpen && (
              <div
                className={`absolute top-6 z-20 flex gap-1 rounded-full bg-[var(--bg-surface)] px-2 py-1 shadow-lg ${mine ? 'left-0' : 'right-0'}`}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className="rounded-full p-0.5 text-base leading-none hover:bg-[var(--bg-hover)]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            mine ? 'bg-[var(--bubble-own)] text-[var(--bubble-own-text)]' : 'bg-[var(--bg-surface)] text-[var(--text-normal)]'
          } ${highlighted ? 'ring-2 ring-[var(--brand)]' : ''}`}
        >
          {isGroup && !mine && !deleted && (
            <p className="mb-0.5 text-xs font-semibold text-[var(--brand)]">{m.sender.firstName}</p>
          )}

          {deleted ? (
            <p className="italic text-[var(--text-muted)]">{t('chat.messageDeleted')}</p>
          ) : editing ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={editDraft}
                onChange={(e) => onEditDraftChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
                className="rounded bg-black/20 px-2 py-1 text-sm text-[var(--text-normal)] outline-none"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button onClick={onCancelEdit} className="text-[var(--text-muted)]">
                  {t('common.cancel')}
                </button>
                <button onClick={onSaveEdit} className="text-[var(--brand)]">
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {m.replyTo && (
                <button
                  onClick={() => m.replyTo && onJump(m.replyTo._id)}
                  className="mb-1 flex w-full flex-col items-start rounded border-l-2 border-[var(--brand)] bg-black/10 px-2 py-1 text-left"
                >
                  <span className="text-xs font-semibold text-[var(--brand)]">
                    {m.replyTo.sender?.firstName || m.replyTo.sender?.username}
                  </span>
                  <span className="max-w-full truncate text-xs opacity-80">
                    {messagePreview(m.replyTo)}
                  </span>
                </button>
              )}
              {m.attachment && m.attachment.mimeType.startsWith('image/') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(m.attachment.url)}
                  alt={m.attachment.fileName}
                  crossOrigin="use-credentials"
                  className="mb-1 max-h-60 w-full rounded object-cover"
                />
              )}
              {m.attachment && !m.attachment.mimeType.startsWith('image/') && (
                <a
                  href={fileUrl(m.attachment.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-1 flex items-center gap-2 rounded bg-black/20 px-2 py-2 hover:bg-black/30"
                >
                  <IconFile size={22} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{m.attachment.fileName}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{formatFileSize(m.attachment.size)}</p>
                  </div>
                  <IconDownload size={16} />
                </a>
              )}

              {m.content && <p>{m.content}</p>}
            </>
          )}

          {!deleted && (
            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--text-muted)]">
              {m.editedAt && <span>{t('chat.edited')}</span>}
              <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {mine && <MessageTicks message={m} otherReads={otherReads} />}
            </div>
          )}
        </div>

        {!deleted && m.reactions && m.reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {m.reactions.map((r) => {
              const reacted = !!currentUserId && r.users.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReact(r.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                    reacted
                      ? 'border-[var(--brand)] bg-[var(--brand)]/20 text-[var(--text-normal)]'
                      : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span>{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {mine && detailOpen && (
          <div data-dismiss-root>
            <MessageInfo
              message={m}
              isGroup={isGroup}
              currentUserId={currentUserId}
              memberReads={memberReads}
              participants={participants}
            />
          </div>
        )}
      </div>
    </div>
  );
}
