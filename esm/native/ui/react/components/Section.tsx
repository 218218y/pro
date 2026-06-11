import type { ReactNode } from 'react';

type SectionProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'transparent';
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Section(props: SectionProps) {
  const { title, children, className, variant = 'default' } = props;
  return (
    <div
      className={cx('control-section', variant === 'transparent' && 'wp-r-section-transparent', className)}
    >
      <span className="section-title">{title}</span>
      {children}
    </div>
  );
}
