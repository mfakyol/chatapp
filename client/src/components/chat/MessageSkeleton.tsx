'use client';


const ROWS: { width: number; mine: boolean }[] = [
  { width: 180, mine: false },
  { width: 240, mine: false },
  { width: 140, mine: true },
  { width: 200, mine: true },
  { width: 120, mine: false },
  { width: 260, mine: true },
  { width: 160, mine: false },
  { width: 220, mine: true },
];


export function MessageSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden px-4 py-4" aria-hidden>
      {ROWS.map((row, i) => (
        <div key={i} className={`mb-3 flex ${row.mine ? 'justify-end' : 'justify-start'}`}>
          <div
            className="h-10 animate-pulse rounded-lg bg-(--bg-surface)"
            style={{ width: row.width }}
          />
        </div>
      ))}
    </div>
  );
}
