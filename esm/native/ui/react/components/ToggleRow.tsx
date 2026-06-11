import { useId, useMemo } from 'react';
import type { ReactNode } from 'react';

type ToggleRowProps = {
  id?: string;
  name?: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  testId?: string;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function ToggleRow(props: ToggleRowProps) {
  const { label, checked, onChange, className, disabled = false, testId, id, name } = props;

  const reactId = useId();
  const inputId = useMemo(
    () => id || `wp-r-toggle-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    [id, reactId]
  );
  const labelId = `${inputId}__label`;

  return (
    <div className={cx('toggle-row', 'wp-r-toggle-row', className)}>
      <span id={labelId}>{label}</span>
      <label>
        <input
          id={inputId}
          name={name || inputId}
          type="checkbox"
          aria-labelledby={labelId}
          data-testid={testId}
          checked={checked}
          disabled={disabled}
          onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => onChange(!!e.target.checked)}
        />
        <div className="toggle-switch"></div>
      </label>
    </div>
  );
}
