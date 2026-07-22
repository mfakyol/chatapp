export function Avatar({ name, isOnline, size = 44 }: { name: string; isOnline?: boolean; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full bg-[var(--brand)] font-medium text-[var(--brand-text)]"
        style={{ fontSize: size / 2.5 }}
      >
        {initials}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--bg-app)] bg-[var(--online)]" />
      )}
    </div>
  );
}
