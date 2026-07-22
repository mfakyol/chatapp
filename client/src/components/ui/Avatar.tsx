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
        className="flex h-full w-full items-center justify-center rounded-full bg-[#00a884] font-medium text-[#111b21]"
        style={{ fontSize: size / 2.5 }}
      >
        {initials}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111b21] bg-[#00a884]" />
      )}
    </div>
  );
}
