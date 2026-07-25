import { cn } from '@/lib/cn';

export function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  'aria-label'?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn('range-slider', className)}
      style={{
        background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${pct}%, var(--bg-elevated) ${pct}%, var(--bg-elevated) 100%)`,
      }}
    />
  );
}
