import type { ReactNode } from 'react';

type InlineNoticeProps = {
  children: ReactNode;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function InlineNotice(props: InlineNoticeProps) {
  const { children, className } = props;
  return <div className={cx('wp-r-note', className)}>{children}</div>;
}
