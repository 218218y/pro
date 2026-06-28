import type { ChangeEvent, FocusEvent, ReactElement } from 'react';

import {
  PLATFORM_OVERHANG_MAX_CM,
  PLATFORM_OVERHANG_MIN_CM,
  PLATFORM_OVERHANG_STEP_CM,
  normalizePlatformOverhangCm,
} from '../../../features/platform_overhang_support.js';

function formatPlatformOverhangInputValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '';
}

export function StructurePlatformOverhangField(props: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (value: number) => void;
  resetTitle: string;
}): ReactElement {
  return (
    <div className="wp-r-door-thickness-field wp-r-platform-overhang-field">
      <label className="wp-r-door-thickness-label">
        <span>{props.label}</span>
      </label>
      <div className="wp-r-door-thickness-input-row wp-r-platform-overhang-input-row">
        <input
          type="number"
          inputMode="decimal"
          className="wp-r-door-thickness-input wp-r-platform-overhang-input"
          min={PLATFORM_OVERHANG_MIN_CM}
          max={PLATFORM_OVERHANG_MAX_CM}
          step={PLATFORM_OVERHANG_STEP_CM}
          value={formatPlatformOverhangInputValue(props.value)}
          onFocus={(event: FocusEvent<HTMLInputElement>) => {
            event.currentTarget.select();
          }}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const rawValue = event.currentTarget.value;
            if (rawValue === '') return;
            props.onChange(normalizePlatformOverhangCm(rawValue, props.defaultValue));
          }}
        />
        <button
          type="button"
          className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-platform-overhang-reset-btn wp-r-styled-tooltip hint-bottom"
          title={props.resetTitle}
          aria-label={props.resetTitle}
          data-tooltip={props.resetTitle}
          onClick={() => props.onChange(props.defaultValue)}
        >
          <i className="fas fa-undo-alt" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
