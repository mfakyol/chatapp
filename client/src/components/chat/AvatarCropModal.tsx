'use client';

import { useCallback, useState } from 'react';
import { IconMinus, IconPlus, IconX } from '@tabler/icons-react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { cropImage } from '@/lib/cropImage';
import { useT } from '@/hooks/useT';

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.05;

export function AvatarCropModal({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const { t } = useT();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_a: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  function stepZoom(delta: number) {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));
  }

  async function handleSave() {
    if (!area) return;
    setSaving(true);
    try {
      const blob = await cropImage(imageSrc, area);
      onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onCancel} className="w-full max-w-sm overflow-hidden rounded-2xl bg-(--bg-chat) shadow-2xl sm:max-w-md">
      <PanelHeader surface className="bg-(--bg-chat)">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-(--text-normal)">{t('myProfile.cropTitle')}</p>
          <p className="text-xs text-(--text-muted)">{t('myProfile.cropHint')}</p>
        </div>
        <Button variant="icon" onClick={onCancel} aria-label={t('common.cancel')}>
          <IconX size={20} />
        </Button>
      </PanelHeader>

      <div className="p-5">
        <div className="relative h-72 overflow-hidden rounded-xl bg-(--bg-app) sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-5 rounded-xl border border-(--border) bg-(--bg-surface) px-4 py-3">
          <p className="mb-3 text-center text-xs font-medium text-(--text-muted)">
            {t('myProfile.zoom')} · {Math.round(zoom * 100)}%
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="icon"
              onClick={() => stepZoom(-ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN}
              aria-label={t('myProfile.zoomOut')}
            >
              <IconMinus size={18} />
            </Button>
            <RangeSlider
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom}
              onChange={setZoom}
              aria-label={t('myProfile.zoom')}
            />
            <Button
              variant="icon"
              onClick={() => stepZoom(ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX}
              aria-label={t('myProfile.zoomIn')}
            >
              <IconPlus size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t border-(--border) bg-(--bg-surface) px-5 py-4">
        <Button
          variant="ghost"
          className="flex-1 px-4 py-2.5 text-(--text-normal)"
          onClick={onCancel}
          disabled={saving}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="primarySm"
          className="flex-1"
          onClick={handleSave}
          loading={saving}
          disabled={!area}
        >
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
}
