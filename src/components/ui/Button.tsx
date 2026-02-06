import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'buy' | 'sell';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent hover:bg-accent-hover text-text-inverse font-medium',
  secondary: 'bg-bg-soft hover:bg-bg-hover border border-line-dark text-text-primary',
  ghost: 'hover:bg-bg-soft/60 text-text-secondary',
  buy: 'bg-up hover:bg-up-light text-white font-bold',
  sell: 'bg-down hover:bg-down-light text-white font-bold',
};


const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2 text-xs rounded-sm',
  md: 'h-8 px-3 text-xs rounded-sm',
  lg: 'h-9 px-4 text-sm rounded-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
