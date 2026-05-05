import { useId } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { InlineNotice } from '../components/InlineNotice.js';
import { ModeToggleButton, OptionButtonGroup } from '../components/index.js';
import { OptionBtn, cx } from './interior_tab_helpers.js';

type NumericFieldProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  placeholder?: string;
  allowEmpty?: boolean;
  onChange: (raw: string) => void;
  onBlur: () => void;
};

export function SketchBoxNumericField(props: NumericFieldProps): ReactElement {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const validationMessage = readSketchBoxNumericValidationMessage(props.value, {
    min: props.min,
    max: props.max,
    allowEmpty: !!props.allowEmpty,
  });

  return (
    <div className="wp-sketch-box-cell wp-sketch-box-cell--input">
      <label htmlFor={inputId} className="wp-r-label wp-r-label--center" style={{ marginBottom: 6 }}>
        {props.label}
      </label>
      <input
        id={inputId}
        type="number"
        className="wp-r-input"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        placeholder={props.placeholder}
        aria-invalid={validationMessage ? true : undefined}
        aria-describedby={validationMessage ? errorId : undefined}
        onFocus={(event: import('react').FocusEvent<HTMLInputElement>) => {
          event.target.select();
        }}
        onChange={(event: import('react').ChangeEvent<HTMLInputElement>) => {
          props.onChange(event.target.value);
        }}
        onBlur={props.onBlur}
      />
      {validationMessage ? (
        <div id={errorId} className="wp-r-input-error" role="alert">
          {validationMessage}
        </div>
      ) : null}
    </div>
  );
}

function readSketchBoxNumericValidationMessage(
  raw: string,
  bounds: { min: number; max: number; allowEmpty: boolean }
): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (text === '-' || text === '.' || text === '-.') return null;

  const value = Number(text);
  if (!Number.isFinite(value)) return 'יש להזין מספר תקין';
  if (value < bounds.min || value > bounds.max) {
    return `הטווח המותר: ${formatSketchBoxNumericBound(bounds.min)}–${formatSketchBoxNumericBound(bounds.max)}`;
  }
  return null;
}

function formatSketchBoxNumericBound(value: number): string {
  return Math.abs(value - Math.round(value)) < 0.0001 ? String(Math.round(value)) : String(value);
}

type ToolButtonProps = {
  label: string;
  active: boolean;
  iconClass: string;
  activeIconClass?: string;
  onClick: () => void;
  buttonClassName?: string;
  cellClassName?: string;
  cellStyle?: CSSProperties;
  buttonChildren?: ReactNode;
};

export function SketchBoxToolButton(props: ToolButtonProps): ReactElement {
  return (
    <div
      className={cx('wp-sketch-box-cell', 'wp-sketch-box-cell--button', props.cellClassName)}
      style={props.cellStyle}
    >
      <div className="wp-r-label wp-r-label--center">{props.label}</div>
      <div className="wp-r-type-selector type-selector" style={{ direction: 'rtl' }}>
        <ModeToggleButton
          active={props.active}
          className={cx('wp-sketch-box-btn', props.buttonClassName)}
          icon={
            <i
              className={props.active ? props.activeIconClass || 'fas fa-check' : props.iconClass}
              aria-hidden="true"
            />
          }
          onClick={props.onClick}
        >
          {props.buttonChildren ?? props.label}
        </ModeToggleButton>
      </div>
    </div>
  );
}

type ToolRowProps = {
  children: ReactNode;
};

export function SketchBoxToolRow(props: ToolRowProps): ReactElement {
  return (
    <div className="wp-sketch-box-cell" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, direction: 'ltr' }}>{props.children}</div>
    </div>
  );
}

type ChoiceOption<T extends string> = {
  id: T;
  label: string;
};

type ChoicePanelProps<T extends string> = {
  title: string;
  open: boolean;
  notice?: ReactNode;
  value: T;
  options: ReadonlyArray<ChoiceOption<T>>;
  onSelect: (value: T) => void;
};

export function SketchBoxChoicePanel<T extends string>(props: ChoicePanelProps<T>): ReactElement {
  const columns = props.options.length === 3 ? 3 : props.options.length === 2 ? 2 : 'auto';

  return (
    <div
      className={cx('wp-sketch-box-cell', 'wp-sketch-choice-panel', props.open ? '' : 'hidden')}
      style={{ gridColumn: '1 / -1' }}
    >
      <div className="wp-sketch-choice-panel-inner">
        <div className="wp-r-label wp-r-label--center wp-sketch-choice-title">{props.title}</div>
        <OptionButtonGroup columns={columns} density="micro" className="wp-sketch-choice-grid">
          {props.options.map(option => (
            <OptionBtn
              key={option.id}
              selected={props.value === option.id}
              onClick={() => {
                props.onSelect(option.id);
              }}
              className="type-option--iconrow wp-sketch-choice-option"
            >
              {option.label}
            </OptionBtn>
          ))}
        </OptionButtonGroup>
        {props.notice ? (
          <div className="wp-sketch-choice-notice">
            <InlineNotice>{props.notice}</InlineNotice>
          </div>
        ) : null}
      </div>
    </div>
  );
}
