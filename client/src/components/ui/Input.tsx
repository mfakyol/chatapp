import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const inputBase =
  'border border-(--input-border) bg-(--input-bg) text-(--text-normal) placeholder-(--text-muted) outline-none transition-colors focus:border-(--brand)';

const variants = {
  default: `${inputBase} rounded-md px-4 py-2.5 focus:ring-2 focus:ring-(--brand)/25`,
  search:
    'w-full border-0 bg-transparent text-sm text-(--text-normal) placeholder-(--text-muted) outline-none',
  compact: `${inputBase} rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-(--brand)/25`,
  inline: `${inputBase} rounded px-2 py-1 text-sm focus:ring-2 focus:ring-(--brand)/25`,
  pill: `${inputBase} flex-1 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-(--brand)/25`,
  ghost: 'rounded border-0 bg-black/20 px-2 py-1 text-sm text-(--text-normal) outline-none',
} as const;

const errorRing =
  'border-(--danger) ring-2 ring-(--danger)/25 focus:border-(--danger) focus:ring-(--danger)/25';

export type InputVariant = keyof typeof variants;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'default', error, className, id, ...props },
  ref
) {
  const errorId = error && id ? `${id}-error` : undefined;

  const input = (
    <input
      ref={ref}
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={errorId}
      className={cn(variants[variant], error && errorRing, className)}
      {...props}
    />
  );

  if (!error) return input;

  return (
    <div className="flex flex-col gap-1">
      {input}
      <p id={errorId} className="text-sm text-(--danger)">
        {error}
      </p>
    </div>
  );
});
