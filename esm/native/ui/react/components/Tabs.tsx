import type { KeyboardEvent, ReactNode } from 'react';

type TabsItem<T extends string> = { id: T; label: string };

type TabsProps<T extends string> = {
  items: Array<TabsItem<T>>;
  active: T;
  onSetActive: (id: T) => void;
  onHoverTab?: (id: T) => void;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function TabsBar<T extends string>(props: TabsProps<T>) {
  const { items, active, onSetActive, onHoverTab, className } = props;

  // Keep the existing tab width and enable horizontal scroll once we exceed five tabs.
  // (E.g. the new "סקיצה" tab.)
  const scroll = items.length > 5;

  const onKey = (id: T, e: KeyboardEvent) => {
    const k = e.key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onSetActive(id);
    }
  };

  return (
    <div className={cx('tabs', 'wp-r-tabs', scroll && 'wp-r-tabs--scroll', className)}>
      {items.map(t => (
        <div
          key={t.id}
          role="button"
          tabIndex={0}
          data-tab={t.id}
          className={active === t.id ? 'tab active' : 'tab'}
          onMouseEnter={() => {
            try {
              if (onHoverTab) onHoverTab(t.id);
            } catch {
              // ignore
            }
          }}
          onFocus={() => {
            try {
              if (onHoverTab) onHoverTab(t.id);
            } catch {
              // ignore
            }
          }}
          onClick={(e: import('react').MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            onSetActive(t.id);
          }}
          onKeyDown={(e: import('react').KeyboardEvent<HTMLDivElement>) => onKey(t.id, e)}
          aria-pressed={active === t.id}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

type TabPanelProps = {
  tabId: string;
  active: boolean;
  children: ReactNode;
  className?: string;
};

export function TabPanel(props: TabPanelProps) {
  const { tabId, active, children, className } = props;
  return (
    <div className={cx('tab-content', active && 'active', className)} data-tab={tabId} aria-hidden={!active}>
      {children}
    </div>
  );
}
