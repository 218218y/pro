import { useId, useMemo } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  containerClassName?: string;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function readStringAttr(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function Select(props: SelectProps) {
  const { label, containerClassName, className, ...rest } = props;
  const reactId = useId();
  const selectId = useMemo(() => {
    const existingId = readStringAttr(rest.id);
    return existingId || `wp-r-select-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }, [rest.id, reactId]);
  const selectName = readStringAttr(rest.name) || selectId;
  return (
    <div className={cx('row', containerClassName)}>
      <div className="col">
        {label ? (
          <label className="wp-r-label" htmlFor={selectId}>
            {label}
          </label>
        ) : null}
        <select {...rest} id={selectId} name={selectName} className={cx(className)} />
      </div>
    </div>
  );
}
