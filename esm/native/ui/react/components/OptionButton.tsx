import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

export type OptionButtonDensity = 'regular' | 'compact' | 'micro';
export type OptionButtonLayout = 'default' | 'iconRow';
export type OptionButtonGroupColumns = 2 | 3 | 'auto';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type OptionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> & {
  selected?: boolean;
  density?: OptionButtonDensity;
  layout?: OptionButtonLayout;
  icon?: ReactNode;
  children: ReactNode;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  onClick?: () => void;
  testId?: string;
};

export function OptionButton(props: OptionButtonProps): ReactElement {
  const {
    selected = false,
    density = 'regular',
    layout = 'default',
    icon,
    children,
    className,
    onClick,
    preventDefault = false,
    stopPropagation = false,
    testId,
    ...rest
  } = props;

  return (
    <button
      {...rest}
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      className={cx(
        'type-option',
        'wp-r-option-button',
        density !== 'regular' && `type-option--${density}`,
        density !== 'regular' && `wp-r-option-button--${density}`,
        layout === 'iconRow' && 'type-option--iconrow',
        layout === 'iconRow' && 'wp-r-option-button--iconrow',
        selected && 'selected active',
        className
      )}
      onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        onClick?.();
      }}
    >
      {icon ? icon : null}
      {children}
    </button>
  );
}

export type OptionButtonGroupProps = {
  children: ReactNode;
  columns?: OptionButtonGroupColumns;
  density?: OptionButtonDensity;
  className?: string;
  labelledBy?: string;
  label?: string;
};

export function OptionButtonGroup(props: OptionButtonGroupProps): ReactElement {
  const { children, columns = 'auto', density = 'regular', className, labelledBy, label } = props;
  return (
    <div
      className={cx(
        'type-selector',
        'wp-r-type-selector',
        'wp-r-option-button-group',
        columns === 2 && 'wp-r-option-button-group--two',
        columns === 3 && 'wp-r-option-button-group--three',
        density !== 'regular' && `wp-r-option-button-group--${density}`,
        className
      )}
      aria-label={label}
      aria-labelledby={labelledBy}
    >
      {children}
    </div>
  );
}
