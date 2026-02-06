import { ReactNode } from 'react';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'neutral' | 'accent' | 'up' | 'down';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const variantClass =
    variant === 'accent'
      ? 'bg-accent text-text-inverse'
      : variant === 'up'
        ? 'bg-up text-white'
        : variant === 'down'
          ? 'bg-down text-white'
          : 'bg-bg-soft text-text-primary';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-pill text-[10px] font-medium',
        variantClass,
        className
      )}
    >
      {children}
    </span>
  );
}

