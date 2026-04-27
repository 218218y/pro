import { useId, useMemo } from 'react';
import type { ChangeEvent, ReactNode, RefObject } from 'react';

type FilePickerRowProps = {
  id?: string;
  name?: string;
  label: ReactNode;
  inputRef?: RefObject<HTMLInputElement | null>;
  accept?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function FilePickerRow(props: FilePickerRowProps) {
  const { label, inputRef, accept, onChange, className, id, name } = props;
  const reactId = useId();
  const inputId = useMemo(
    () => id || `wp-r-file-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    [id, reactId]
  );
  return (
    <div className={cx('wp-r-file-row', className)}>
      <label className="wp-r-label wp-r-label-block" htmlFor={inputId}>
        {label}
      </label>
      <div className="wp-r-file-input">
        <input
          ref={inputRef}
          id={inputId}
          name={name || inputId}
          type="file"
          accept={accept}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
