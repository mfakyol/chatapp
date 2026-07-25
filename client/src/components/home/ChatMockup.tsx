import { IconArrowRight, IconChecks, IconPaperclip } from '@tabler/icons-react';
import type { Translator } from '@/i18n/translate';

export function ChatMockup({ t }: { t: Translator }) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--bg-chat) text-(--text-normal)">
        <div className="flex items-center gap-3 border-b border-(--border) bg-(--bg-chat) px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--brand)/20 text-sm font-semibold text-(--brand)">
            {t('home.mockupContactInitials')}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">{t('home.mockupContactName')}</p>
            <p className="flex items-center gap-1 text-xs text-(--online)">
              <span className="h-1.5 w-1.5 rounded-full bg-(--online)" />
              {t('chat.online')}
            </p>
          </div>
        </div>

        <div className="space-y-2 bg-(--bg-app) px-3 py-4">
          <div className="max-w-[75%] rounded-lg rounded-tl-sm bg-(--bg-elevated) px-3 py-2 text-sm">
            {t('home.mockupMsg1')}
            <span className="mt-1 block text-right text-[10px] text-(--text-muted)">20:41</span>
          </div>
          <div className="ml-auto max-w-[75%] rounded-lg rounded-tr-sm bg-(--bubble-own) px-3 py-2 text-sm text-(--bubble-own-text)">
            {t('home.mockupMsg2')}
            <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-(--bubble-own-text)/70">
              20:42
              <IconChecks className="h-3.5 w-3.5 text-(--tick)" stroke={2} />
            </span>
          </div>
          <div className="ml-auto max-w-[75%] rounded-lg rounded-tr-sm bg-(--bubble-own) px-3 py-2 text-sm text-(--bubble-own-text)">
            {t('home.mockupMsg3')}
            <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-(--bubble-own-text)/70">
              20:42
              <IconChecks className="h-3.5 w-3.5 text-(--tick)" stroke={2} />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-(--border) bg-(--bg-chat) px-3 py-3">
          <IconPaperclip className="h-5 w-5 text-(--text-muted)" stroke={2} />
          <div className="flex-1 rounded-full bg-(--input-bg) px-4 py-2 text-sm text-(--text-muted)">
            {t('chat.typeMessage')}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand) text-(--brand-text)">
            <IconArrowRight className="h-4 w-4" stroke={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
}
