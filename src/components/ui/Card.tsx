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
        bg-bg-secondary/70 backdrop-blur 
        rounded-xl border border-white/10 
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
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-bg-tertiary/30">
      <h3 className="font-heading font-medium text-sm text-slate-200">{title}</h3>
      {extra}
    </div>
  );
}
