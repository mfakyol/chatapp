'use client';

import { memo } from 'react';
import { MessageTicks } from '@/components/chat/MessageTicks';
import { MessageInfo } from '@/components/chat/MessageInfo';
import { Message, PublicUser } from '@/types';
import { messagePreview } from '@/lib/format';
import { useT } from '@/hooks/useT';
import { ReplyQuote } from '@/components/chat/message-bubble/ReplyQuote';
import { ReactionPill } from '@/components/chat/message-bubble/ReactionPill';
import { MessageAttachment } from '@/components/chat/message-bubble/MessageAttachment';
import { MessageBubbleToolbar } from '@/components/chat/message-bubble/MessageBubbleToolbar';
import { MessageEditForm } from '@/components/chat/message-bubble/MessageEditForm';

export interface BubbleActions {
  toggleMenu(id: string): void;
  togglePicker(id: string): void;
  toggleDetail(id: string): void;
  startEdit(message: Message): void;
  cancelEdit(): void;
  setEditDraft(value: string): void;
  saveEdit(id: string): void;
  remove(id: string): void;
  react(id: string, emoji: string): void;
  reply(message: Message): void;
  jump(id: string): void;
}

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
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  actions: BubbleActions;
}


export const MessageBubble = memo(function MessageBubble({
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
  registerRef,
  actions,
}: MessageBubbleProps) {
  const { t } = useT();
  const deleted = !!m.deletedAt;

  return (
    <div className={`group mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-xs" data-mid={m._id} ref={(el) => registerRef(m._id, el)}>
        {!deleted && (
          <MessageBubbleToolbar
            message={m}
            mine={mine}
            menuOpen={menuOpen}
            pickerOpen={pickerOpen}
            onToggleMenu={() => actions.toggleMenu(m._id)}
            onTogglePicker={() => actions.togglePicker(m._id)}
            onToggleDetail={() => actions.toggleDetail(m._id)}
            onStartEdit={() => actions.startEdit(m)}
            onRemove={() => actions.remove(m._id)}
            onReply={() => actions.reply(m)}
            onReact={(emoji) => actions.react(m._id, emoji)}
          />
        )}

        <div
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            mine ? 'bg-(--bubble-own) text-(--bubble-own-text)' : 'bg-(--bg-surface) text-(--text-normal)'
          } ${highlighted ? 'ring-2 ring-(--brand)' : ''}`}
        >
          {isGroup && !mine && !deleted && (
            <p className="mb-0.5 text-xs font-semibold text-(--brand)">{m.sender.firstName}</p>
          )}

          {deleted ? (
            <p className="italic text-(--text-muted)">{t('chat.messageDeleted')}</p>
          ) : editing ? (
            <MessageEditForm
              draft={editDraft}
              onDraftChange={actions.setEditDraft}
              onSave={() => actions.saveEdit(m._id)}
              onCancel={actions.cancelEdit}
            />
          ) : (
            <>
              {m.replyTo && (
                <ReplyQuote
                  senderName={m.replyTo.sender?.firstName || m.replyTo.sender?.username || ''}
                  preview={messagePreview(m.replyTo)}
                  onClick={() => m.replyTo && actions.jump(m.replyTo._id)}
                />
              )}
              {m.attachment && <MessageAttachment attachment={m.attachment} />}
              {m.content && <p>{m.content}</p>}
            </>
          )}

          {!deleted && (
            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-(--text-muted)">
              {m.editedAt && <span>{t('chat.edited')}</span>}
              <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {mine && <MessageTicks message={m} otherReads={otherReads} />}
            </div>
          )}
        </div>

        {!deleted && m.reactions && m.reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {m.reactions.map((r) => (
              <ReactionPill
                key={r.emoji}
                emoji={r.emoji}
                count={r.users.length}
                active={!!currentUserId && r.users.includes(currentUserId)}
                onClick={() => actions.react(m._id, r.emoji)}
              />
            ))}
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
});
