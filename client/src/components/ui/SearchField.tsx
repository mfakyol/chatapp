import { IconSearch, IconX } from '@tabler/icons-react';
import { InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const wrappers = {
  elevated: 'flex items-center gap-2 rounded-md bg-(--bg-elevated) px-3 py-2',
  bordered: 'flex items-center gap-2 border-b border-(--border) px-3 py-2',
} as const;

export type SearchFieldVariant = keyof typeof wrappers;

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  variant?: SearchFieldVariant;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  wrapperClassName?: string;
}

export function SearchField({
  variant = 'elevated',
  value,
  onChange,
  onClear,
  wrapperClassName,
  className,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn(wrappers[variant], wrapperClassName)}>
      <IconSearch size={16} className="shrink-0 text-(--text-muted)" />
      <Input
        variant="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        {...props}
      />
      {onClear && value && (
        <Button type="button" variant="unstyled" onClick={onClear} className="shrink-0 text-(--text-muted)">
          <IconX size={16} />
        </Button>
      )}
    </div>
  );
}
