import type { ReactNode } from 'react';

type FieldRowProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  help?: ReactNode;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function FieldRow(props: FieldRowProps) {
  const { label, children, className, labelClassName, help } = props;
  return (
    <div className={cx('wp-r-field', className)}>
      <label className={cx('wp-r-label', labelClassName)}>{label}</label>
      {children}
      {help ? <div className="wp-r-help">{help}</div> : null}
    </div>
  );
}
