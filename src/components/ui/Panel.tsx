import { ReactNode, useId } from 'react';

type Density = 'default' | 'compact';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

interface PanelProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  density?: Density;
}

export function Panel({ children, className, noPadding, density = 'default' }: PanelProps) {
  const paddingClass = noPadding ? '' : density === 'compact' ? 'p-2' : 'p-3';
  return (
    <section
      className={cn(
        'bg-bg-card rounded-panel border border-line-dark overflow-hidden',
        paddingClass,
        className
      )}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, actions, className }: PanelHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-2 px-3 h-8 border-b border-line-dark bg-bg-panel',
        className
      )}
    >
      <div className="min-w-0 flex items-center gap-2">
        {title ? <div className="truncate font-heading font-medium text-xs text-text-primary">{title}</div> : null}
      </div>
      {actions ? <div className="shrink-0 flex items-center gap-1">{actions}</div> : null}
    </header>
  );
}

type TabKey = string;

export interface PanelTab {
  key: TabKey;
  label: ReactNode;
  badge?: number;
}

interface PanelTabsProps {
  tabs: PanelTab[];
  activeKey: TabKey;
  onChange: (key: TabKey) => void;
  'aria-label'?: string;
  className?: string;
}

export function PanelTabs({ tabs, activeKey, onChange, className, ...aria }: PanelTabsProps) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={aria['aria-label'] || 'tabs'}
      className={cn('flex items-center gap-0.5 px-2 h-8 border-b border-line-dark bg-bg-panel', className)}
    >
      {tabs.map((t) => {
        const selected = t.key === activeKey;
        return (
          <button
            key={t.key}
            id={`${id}-${t.key}`}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              'relative h-7 px-3 text-xs font-medium rounded-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35',
              selected
                ? 'text-text-primary bg-bg-soft'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.label}
              {typeof t.badge === 'number' ? (
                <span className="min-w-[18px] h-[18px] px-1 rounded-pill bg-accent text-[10px] text-text-inverse flex items-center justify-center font-medium">
                  {t.badge}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface PanelBodyProps {
  children: ReactNode;
  className?: string;
}

export function PanelBody({ children, className }: PanelBodyProps) {
  return <div className={cn('min-h-0', className)}>{children}</div>;
}

