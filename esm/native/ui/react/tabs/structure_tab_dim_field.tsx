import { useCallback } from 'react';

import type { StructureDimFieldProps } from './structure_tab_dimension_field_contracts.js';
import {
  blurStructureDimOnWheel,
  formatStructureDraftValue,
  isStructureSameNumericValue,
  readStructureRequiredCommit,
  selectStructureDimInput,
  useStructureDimInputId,
  useStructureDraft,
} from './structure_tab_dimension_field_shared.js';

export function DimField(props: StructureDimFieldProps) {
  const [draft, setDraft] = useStructureDraft(props.value);

  const commitIfValid = useCallback(
    (raw: string) => {
      const next = readStructureRequiredCommit(raw);
      if (next.kind !== 'value') return;
      props.onCommit(next.value);
    },
    [props.onCommit]
  );

  const inputId = useStructureDimInputId(props.activeId, 'dim');
  const ariaLabel = props.ariaLabel || (typeof props.label === 'string' ? props.label : 'שדה מידה');
  const hasInputAddon = !!props.inputAddon || !!props.reserveInputAddon;

  return (
    <div className="wp-r-field" data-wp-react-active={props.activeId}>
      <div className="wp-r-label-row">
        <label htmlFor={inputId}>{props.label}</label>
        {props.labelAddon ? <div className="wp-r-label-addon">{props.labelAddon}</div> : null}
      </div>
      <div className={hasInputAddon ? 'wp-r-input-row wp-r-input-row--with-addon' : 'wp-r-input-row'}>
        <input
          id={inputId}
          name={String(props.activeId || 'dim')}
          data-wp-active-id={props.activeId}
          aria-label={ariaLabel}
          type="number"
          className={hasInputAddon ? 'wp-r-input wp-r-input--with-addon' : 'wp-r-input'}
          value={draft}
          step={props.step}
          onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => {
            selectStructureDimInput(e, 'L40');
          }}
          onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setDraft(value);
            commitIfValid(value);
          }}
          onBlur={() => {
            const next = readStructureRequiredCommit(draft);
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
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          onWheel={blurStructureDimOnWheel}
        />
        {hasInputAddon ? (
          <div
            className={props.inputAddon ? 'wp-r-input-addon' : 'wp-r-input-addon wp-r-input-addon--spacer'}
            aria-hidden={props.inputAddon ? undefined : true}
          >
            {props.inputAddon ?? null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
