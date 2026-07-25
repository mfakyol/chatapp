'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCamera, IconX } from '@tabler/icons-react';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarCropModal } from '@/components/chat/AvatarCropModal';
import { Button } from '@/components/ui/Button';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { FormError } from '@/components/ui/FormError';
import { useAuthStore } from '@/stores/auth.store';
import { uploadAvatar } from '@/services/user.service';
import { loadConversations } from '@/services/chat.service';
import { fullName } from '@/lib/utils';
import { useT } from '@/hooks/useT';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

export function MyProfilePanel({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  if (!user) return null;

  function openCrop(file: File) {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError(t('myProfile.invalidType'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('myProfile.fileTooLarge'));
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropped(file: File) {
    closeCrop();
    if (file.size > MAX_BYTES) {
      setError(t('myProfile.fileTooLarge'));
      return;
    }
    setUploading(true);
    const res = await uploadAvatar(file);
    setUploading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setUser(res.data.user);
    loadConversations();
  }

  return (
    <>
      <div className="flex h-full w-full max-w-sm flex-col border-l border-(--border) bg-(--bg-app) md:max-w-md">
        <PanelHeader surface>
          <p className="min-w-0 flex-1 font-medium text-(--text-normal)">{t('myProfile.title')}</p>
          <Button variant="icon" onClick={onClose} aria-label={t('common.cancel')}>
            <IconX size={20} />
          </Button>
        </PanelHeader>

        <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-6 py-8">
          <div className="relative">
            <Avatar name={fullName(user)} size={96} user={user} />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-(--brand) text-(--brand-text) shadow-md hover:bg-(--brand-hover) disabled:opacity-60"
              title={t('myProfile.changeAvatar')}
              aria-label={t('myProfile.changeAvatar')}
            >
              <IconCamera size={16} />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) openCrop(file);
              }}
            />
          </div>

          {uploading && <p className="text-sm text-(--text-muted)">{t('myProfile.uploading')}</p>}
          {error && <FormError>{error}</FormError>}

          <div className="w-full space-y-3 text-center">
            <p className="text-lg font-medium text-(--text-normal)">{fullName(user)}</p>
            <p className="text-sm text-(--text-muted)">@{user.username}</p>
          </div>
        </div>
      </div>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onCancel={closeCrop}
          onConfirm={handleCropped}
        />
      )}
    </>
  );
}
