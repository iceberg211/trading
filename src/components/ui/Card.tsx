import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  density?: 'default' | 'compact';
}

export function Card({ children, className = '', noPadding = false, density = 'default' }: CardProps) {
  const paddingClass = noPadding ? '' : density === 'compact' ? 'p-2' : 'p-3';

  return (
    <div
      className={`
        bg-bg-card
        rounded-panel border border-line-dark
        overflow-hidden
        ${paddingClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  extra?: ReactNode;
}

export function CardHeader({ title, extra }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 h-8 border-b border-line-dark bg-bg-panel">
      <h3 className="font-heading font-medium text-xs text-text-primary">{title}</h3>

      {extra}
    </div>
  );
}
