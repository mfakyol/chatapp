import { useToastStore } from '@/stores/toast.store';

export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-md bg-(--bg-elevated) px-3 py-2 text-xs text-(--text-normal) shadow-lg"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
