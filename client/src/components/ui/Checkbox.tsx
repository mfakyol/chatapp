import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn('flex cursor-pointer items-center gap-2 text-sm text-(--text-normal)', className)}
    >
      <input id={id} type="checkbox" className="accent-(--brand)" {...props} />
      {label}
    </label>
  );
}
