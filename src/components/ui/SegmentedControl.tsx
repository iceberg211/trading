import { ReactNode } from 'react';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'sm',
  className,
}: SegmentedControlProps<T>) {
  const heightClass = size === 'sm' ? 'h-7' : 'h-8';
  const itemClass = size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-3 text-xs';

  return (
    <div className={cn('inline-flex items-center rounded-sm border border-line-dark bg-bg-soft/40 p-0.5', heightClass, className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
              itemClass,
              active ? 'bg-bg-card text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

