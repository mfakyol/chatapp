'use client';


export function DateChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-(--bg-elevated) px-3 py-1 text-[11px] font-medium text-(--text-muted) shadow">
      {label}
    </span>
  );
}
