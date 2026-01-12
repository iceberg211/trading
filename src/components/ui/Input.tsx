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
            <label className="text-xs text-slate-400">{label}</label>
            {rightElement}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full bg-bg-tertiary/80 border border-white/10 rounded-lg 
              px-3 py-2.5 text-right font-mono text-slate-100 
              placeholder-slate-600 
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 
              transition-all
              ${error ? 'border-down/50 focus:ring-down/50' : ''}
              ${suffix ? 'pr-14' : ''}
              ${className}
            `}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
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
