import type { CSSProperties, FocusEvent, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';

import { clampStyledTooltipToViewport, resetStyledTooltipViewportClamp } from './TooltipPlacement.js';

type ColorSwatchProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'onKeyDown' | 'title'> & {
  title: string;
  selected?: boolean;
  special?: boolean;
  backgroundColor?: string;
  backgroundImage?: string;
  onPick: () => void;
  children?: ReactNode;
};

type ColorSwatchItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'onKeyDown' | 'title'> & {
  title: string;
  selected?: boolean;
  saved?: boolean;
  draggable?: boolean;
  swatchStyle?: CSSProperties;
  onPick: () => void;
  children?: ReactNode;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function normalizeTooltip(value: string): string | undefined {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
}

function handleActivation(event: KeyboardEvent<HTMLDivElement>, onPick: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  event.stopPropagation();
  onPick();
}

function cssUrl(value: string): string {
  return `url(${JSON.stringify(value)})`;
}

function attachTooltipPlacementHandlers<T extends HTMLDivElement>(args: {
  tooltip: string | undefined;
  onMouseEnter?: HTMLAttributes<T>['onMouseEnter'];
  onMouseLeave?: HTMLAttributes<T>['onMouseLeave'];
  onFocus?: HTMLAttributes<T>['onFocus'];
  onBlur?: HTMLAttributes<T>['onBlur'];
}) {
  const { tooltip, onMouseEnter, onMouseLeave, onFocus, onBlur } = args;
  return {
    onMouseEnter(event: MouseEvent<T>) {
      onMouseEnter?.(event);
      clampStyledTooltipToViewport(event.currentTarget, tooltip);
    },
    onMouseLeave(event: MouseEvent<T>) {
      onMouseLeave?.(event);
      resetStyledTooltipViewportClamp(event.currentTarget);
    },
    onFocus(event: FocusEvent<T>) {
      onFocus?.(event);
      clampStyledTooltipToViewport(event.currentTarget, tooltip);
    },
    onBlur(event: FocusEvent<T>) {
      onBlur?.(event);
      resetStyledTooltipViewportClamp(event.currentTarget);
    },
  };
}

export function ColorSwatch(props: ColorSwatchProps) {
  const {
    title,
    selected = false,
    special = false,
    backgroundColor,
    backgroundImage,
    onPick,
    children,
    className,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  } = props;

  const style: CSSProperties = backgroundImage
    ? { backgroundImage: cssUrl(backgroundImage) }
    : backgroundColor
      ? { backgroundColor }
      : {};
  const tooltip = normalizeTooltip(title);
  const tooltipHandlers = attachTooltipPlacementHandlers<HTMLDivElement>({
    tooltip,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  });

  return (
    <div
      {...rest}
      className={cx(
        'color-dot-swatch',
        'wp-r-color-swatch',
        tooltip && 'wp-r-styled-tooltip hint-bottom',
        special && 'special-swatch',
        selected && 'is-selected',
        className
      )}
      data-tooltip={tooltip}
      aria-label={rest['aria-label'] || tooltip}
      style={style}
      {...tooltipHandlers}
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => handleActivation(event, onPick)}
    >
      {children}
    </div>
  );
}

export function ColorSwatchItem(props: ColorSwatchItemProps) {
  const {
    title,
    selected = false,
    saved = false,
    draggable = false,
    swatchStyle,
    onPick,
    children,
    className,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  } = props;

  const tooltip = normalizeTooltip(title);
  const tooltipHandlers = attachTooltipPlacementHandlers<HTMLDivElement>({
    tooltip,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  });

  return (
    <div
      {...rest}
      className={cx(
        'wp-swatch-item',
        tooltip && 'wp-r-styled-tooltip hint-bottom',
        saved && 'is-saved',
        className
      )}
      data-tooltip={tooltip}
      aria-label={rest['aria-label'] || tooltip}
      {...tooltipHandlers}
      onClick={onPick}
      role="button"
      tabIndex={0}
      draggable={draggable}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => handleActivation(event, onPick)}
    >
      <div
        className={cx('color-dot-swatch', 'wp-r-color-swatch', selected && 'is-selected')}
        style={swatchStyle}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
