import {
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconInfoCircle,
  IconMoodPlus,
  IconArrowBackUp,
} from '@tabler/icons-react';
import { Message } from '@/types';
import { Button } from '@/components/ui/Button';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { QuickReactionPicker } from '@/components/chat/message-bubble/QuickReactionPicker';
import { useT } from '@/hooks/useT';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function MessageBubbleToolbar({
  message,
  mine,
  menuOpen,
  pickerOpen,
  onToggleMenu,
  onTogglePicker,
  onToggleDetail,
  onStartEdit,
  onRemove,
  onReply,
  onReact,
}: {
  message: Message;
  mine: boolean;
  menuOpen: boolean;
  pickerOpen: boolean;
  onToggleMenu: () => void;
  onTogglePicker: () => void;
  onToggleDetail: () => void;
  onStartEdit: () => void;
  onRemove: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
}) {
  const { t } = useT();
  return (
    <>
      {mine && (
        <div
          data-dismiss-root
          className="absolute -top-2 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Button variant="floating" onClick={onToggleMenu} aria-label={t('chat.messageMenu')}>
            <IconDotsVertical size={14} />
          </Button>
          {menuOpen && (
            <DropdownMenu className="right-0 top-6 w-40">
              <Button variant="menuItem" onClick={onToggleDetail}>
                <IconInfoCircle size={16} /> {t('chat.info')}
              </Button>
              {!message.attachment && (
                <Button variant="menuItem" onClick={onStartEdit}>
                  <IconPencil size={16} /> {t('chat.edit')}
                </Button>
              )}
              <Button variant="menuItemDanger" onClick={onRemove}>
                <IconTrash size={16} /> {t('chat.delete')}
              </Button>
            </DropdownMenu>
          )}
        </div>
      )}

      <div
        data-dismiss-root
        className={`absolute -top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${mine ? 'left-1' : 'right-1'}`}
      >
        <Button
          variant="floating"
          onClick={onTogglePicker}
          title={t('chat.react')}
          aria-label={t('chat.react')}
        >
          <IconMoodPlus size={14} />
        </Button>
        <Button variant="floating" onClick={onReply} title={t('chat.reply')} aria-label={t('chat.reply')}>
          <IconArrowBackUp size={14} />
        </Button>
        {pickerOpen && (
          <QuickReactionPicker
            emojis={QUICK_REACTIONS}
            align={mine ? 'left' : 'right'}
            onPick={onReact}
          />
        )}
      </div>
    </>
  );
}
