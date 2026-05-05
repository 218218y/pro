import { useCallback } from 'react';
import type { MouseEvent } from 'react';

import { structureTabReportNonFatal } from './structure_tab_shared.js';
import type { StructureOptionalDimFieldProps } from './structure_tab_dimension_field_contracts.js';
import {
  blurStructureDimOnWheel,
  formatStructureDraftValue,
  isStructureSameNumericValue,
  readStructureDimensionValidationMessage,
  readStructureOptionalCommit,
  resolveStructurePlaceholderArrowStep,
  resolveStructureSpinnerPointerStep,
  selectStructureDimInput,
  useStructureDimInputId,
  useStructureDraft,
} from './structure_tab_dimension_field_shared.js';

export function OptionalDimField(props: StructureOptionalDimFieldProps) {
  const [draft, setDraft] = useStructureDraft(props.value);

  const commitMaybe = useCallback(
    (raw: string) => {
      const next = readStructureOptionalCommit(raw, props.bounds);
      if (next.kind === 'empty') {
        props.onCommit(null);
        return;
      }
      if (next.kind !== 'value') return;
      props.onCommit(next.value);
    },
    [props.bounds, props.onCommit]
  );

  const handleNativeSpinMouseDown = useCallback(
    (e: MouseEvent<HTMLInputElement>) => {
      const next = resolveStructureSpinnerPointerStep({
        event: e,
        draft,
        placeholder: props.placeholder,
        step: props.step,
        bounds: props.bounds,
      });
      if (next == null) return;
      const value = String(next);

      e.preventDefault();
      e.stopPropagation();
      setDraft(value);
      commitMaybe(value);

      try {
        e.currentTarget.focus();
      } catch (__wpErr) {
        structureTabReportNonFatal('L48', __wpErr);
      }
    },
    [commitMaybe, draft, props.bounds, props.placeholder, props.step]
  );

  const inputId = useStructureDimInputId(props.activeId, 'dimopt');
  const errorId = `${inputId}-error`;
  const validationMessage = readStructureDimensionValidationMessage(draft, props.bounds, true);

  return (
    <div className="wp-r-field" data-wp-react-active={props.activeId}>
      <label htmlFor={inputId}>{props.label}</label>
      <div className="wp-r-input-row">
        <input
          id={inputId}
          name={String(props.activeId || 'dim')}
          data-wp-active-id={props.activeId}
          aria-label={props.label}
          aria-invalid={validationMessage ? true : undefined}
          aria-describedby={validationMessage ? errorId : undefined}
          type="number"
          className="wp-r-input"
          value={draft}
          placeholder={props.placeholder != null ? String(props.placeholder) : undefined}
          min={props.bounds?.allowZero ? 0 : props.bounds?.min}
          max={props.bounds?.max}
          step={props.step}
          onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => {
            selectStructureDimInput(e, 'L72');
          }}
          onMouseDown={handleNativeSpinMouseDown}
          onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setDraft(value);
            commitMaybe(value);
          }}
          onBlur={() => {
            const next = readStructureOptionalCommit(draft, props.bounds);
            if (next.kind === 'empty') {
              if (props.value === '') return;
              props.onCommit(null);
              return;
            }
            if (next.kind !== 'value') {
              setDraft(formatStructureDraftValue(props.value));
              return;
            }
            if (isStructureSameNumericValue(props.value, next.value)) {
              setDraft(formatStructureDraftValue(props.value));
              return;
            }
            props.onCommit(next.value);
          }}
          onKeyDown={(e: import('react').KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
              return;
            }
            const next = resolveStructurePlaceholderArrowStep({
              key: e.key,
              draft,
              placeholder: props.placeholder,
              step: props.step,
              bounds: props.bounds,
            });
            if (next == null) return;
            const value = String(next);
            setDraft(value);
            commitMaybe(value);
            e.preventDefault();
            e.stopPropagation();
          }}
          onWheel={blurStructureDimOnWheel}
        />
      </div>
      {validationMessage ? (
        <div id={errorId} className="wp-r-input-error" role="alert">
          {validationMessage}
        </div>
      ) : null}
    </div>
  );
}
