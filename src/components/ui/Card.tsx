import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = '', noPadding = false }: CardProps) {
  return (
    <div
      className={`
        bg-bg-panel/80 backdrop-blur 
        rounded-xl border border-line 

        overflow-hidden
        ${noPadding ? '' : 'p-4'}
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
    <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-bg-soft/60">
      <h3 className="font-heading font-medium text-sm text-text-primary">{title}</h3>

      {extra}
    </div>
  );
}
