import { OptionButton } from '../components/index.js';

import { cx } from './interior_tab_helpers_core.js';
import type { CountBtnProps, OptionBtnProps } from './interior_tab_helpers_types.js';

export function OptionBtn(props: OptionBtnProps) {
  const { selected = false, className, onClick, children, title, testId } = props;
  return (
    <OptionButton
      title={title}
      testId={testId}
      selected={selected}
      density="compact"
      className={className}
      preventDefault
      stopPropagation
      onClick={onClick}
    >
      {children}
    </OptionButton>
  );
}

export function CountBtn(props: CountBtnProps) {
  const { selected = false, className, onClick, children, title, testId } = props;
  return (
    <button
      type="button"
      data-tooltip={title}
      data-testid={testId}
      className={cx(
        'btn',
        'btn-count',
        'btn-inline',
        'wp-flex-1',
        title && 'wp-r-styled-tooltip hint-bottom',
        selected && 'is-selected',
        className
      )}
      onClick={(e: import('react').MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}
