import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, suffix, error, rightElement, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-xs text-text-secondary">{label}</label>

            {rightElement}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full bg-bg-soft/80 border border-line rounded-lg 
              px-3 py-2.5 text-right font-mono text-text-primary 
              placeholder:text-text-tertiary 
              focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent 
              transition-all
              hover:border-line-light
              ${error ? 'border-down/60 focus:ring-down/40' : ''}
              ${suffix ? 'pr-14' : ''}
              ${className}

            `}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary pointer-events-none">

              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-down">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
