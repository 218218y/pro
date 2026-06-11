import type { ButtonHTMLAttributes, FocusEvent, MouseEvent, ReactElement, ReactNode } from 'react';

import { clampStyledTooltipToViewport, resetStyledTooltipViewportClamp } from './TooltipPlacement.js';

export type OptionButtonDensity = 'regular' | 'compact' | 'micro';
export type OptionButtonLayout = 'default' | 'iconRow';
export type OptionButtonGroupColumns = 2 | 3 | 'auto';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function normalizeTooltip(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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
    title,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    preventDefault = false,
    stopPropagation = false,
    testId,
    ...rest
  } = props;
  const tooltip = normalizeTooltip(title);

  return (
    <button
      {...rest}
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      data-tooltip={tooltip}
      onMouseEnter={(event: MouseEvent<HTMLButtonElement>) => {
        onMouseEnter?.(event);
        clampStyledTooltipToViewport(event.currentTarget, tooltip);
      }}
      onMouseLeave={(event: MouseEvent<HTMLButtonElement>) => {
        onMouseLeave?.(event);
        resetStyledTooltipViewportClamp(event.currentTarget);
      }}
      onFocus={(event: FocusEvent<HTMLButtonElement>) => {
        onFocus?.(event);
        clampStyledTooltipToViewport(event.currentTarget, tooltip);
      }}
      onBlur={(event: FocusEvent<HTMLButtonElement>) => {
        onBlur?.(event);
        resetStyledTooltipViewportClamp(event.currentTarget);
      }}
      className={cx(
        'type-option',
        'wp-r-option-button',
        density !== 'regular' && `type-option--${density}`,
        density !== 'regular' && `wp-r-option-button--${density}`,
        layout === 'iconRow' && 'type-option--iconrow',
        layout === 'iconRow' && 'wp-r-option-button--iconrow',
        tooltip && 'wp-r-styled-tooltip hint-bottom',
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
