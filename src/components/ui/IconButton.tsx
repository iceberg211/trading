import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'soft';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 'sm', variant = 'ghost', className, ...props },
  ref
) {
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const variantClass = variant === 'soft' ? 'bg-bg-soft/60 hover:bg-bg-soft' : 'hover:bg-bg-soft/60';

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-sm text-text-secondary transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClass,
        variantClass,
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
});

