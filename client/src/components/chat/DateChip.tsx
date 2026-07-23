'use client';

/** The date pill — used both inline between messages and as the floating chip. */
export function DateChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] shadow">
      {label}
    </span>
  );
}
