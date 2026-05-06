import type { Dispatch, ReactElement, SetStateAction } from 'react';

import type { DoorTrimUiAxis, DoorTrimUiSpan } from './interior_tab_helpers.js';
import {
  DEFAULT_DOOR_TRIM_CROSS_SIZE_CM,
  MAX_DOOR_TRIM_CROSS_SIZE_CM,
  MAX_DOOR_TRIM_CUSTOM_CM,
  MIN_DOOR_TRIM_CROSS_SIZE_CM,
  MIN_DOOR_TRIM_CUSTOM_CM,
} from '../../../features/door_trim.js';
import { CountBtn } from './interior_tab_helpers.js';
import {
  DOOR_TRIM_SPAN_PRIMARY_OPTIONS,
  DOOR_TRIM_SPAN_SECONDARY_OPTIONS,
} from './interior_tab_sections_shared.js';

type DoorTrimAxisPanelProps = {
  axis: DoorTrimUiAxis;
  title: string;
  fullSpanLabel: string;
  customPlaceholder: string;
  crossPlaceholder: string;
  span: DoorTrimUiSpan;
  customCm: number | '';
  customDraft: string;
  crossCm: number | '';
  crossDraft: string;
  isDoorTrimMode: boolean;
  setSpan: Dispatch<SetStateAction<DoorTrimUiSpan>>;
  setCustomCm: Dispatch<SetStateAction<number | ''>>;
  setCustomDraft: Dispatch<SetStateAction<string>>;
  setCrossCm: Dispatch<SetStateAction<number | ''>>;
  setCrossDraft: Dispatch<SetStateAction<string>>;
  activateDoorTrimMode: (
    axis: DoorTrimUiAxis,
    span: DoorTrimUiSpan,
    sizeCm?: number | '',
    crossSizeCm?: number | ''
  ) => void;
};

function clampDoorTrimInput(
  raw: string,
  current: number | '',
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(raw);
  const base = Number.isFinite(parsed) ? parsed : typeof current === 'number' ? current : fallback;
  return Math.max(min, Math.min(max, base));
}

function resolveDoorTrimCustomSize(span: DoorTrimUiSpan, customCm: number | ''): number | '' {
  return span === 'custom' ? customCm : '';
}

function renderSpanButtons(
  rowOptions: ReadonlyArray<{ id: DoorTrimUiSpan; label: string }>,
  props: DoorTrimAxisPanelProps
): ReactElement {
  return (
    <div className="wp-door-trim-span-row">
      {rowOptions.map(option => (
        <CountBtn
          key={`${props.axis}_${option.id}`}
          className="wp-door-trim-span-btn"
          selected={props.span === option.id}
          onClick={() => {
            props.setSpan(option.id);
            props.activateDoorTrimMode(
              props.axis,
              option.id,
              resolveDoorTrimCustomSize(option.id, props.customCm),
              props.crossCm
            );
          }}
        >
          {option.id === 'full' ? props.fullSpanLabel : option.label}
        </CountBtn>
      ))}
    </div>
  );
}

export function DoorTrimAxisPanel(props: DoorTrimAxisPanelProps): ReactElement {
  return (
    <>
      <div className="wp-r-label wp-r-label--center" style={{ marginTop: 14, marginBottom: 8 }}>
        {props.title}
      </div>
      <div className="wp-door-trim-span-grid" style={{ marginBottom: 8 }}>
        {renderSpanButtons(DOOR_TRIM_SPAN_PRIMARY_OPTIONS, props)}
        {renderSpanButtons(DOOR_TRIM_SPAN_SECONDARY_OPTIONS, props)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, direction: 'rtl' }}>
        <input
          type="number"
          className="wp-r-input"
          value={props.customDraft}
          min={MIN_DOOR_TRIM_CUSTOM_CM}
          max={MAX_DOOR_TRIM_CUSTOM_CM}
          step={1}
          placeholder={props.customPlaceholder}
          onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => e.target.select()}
          onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            props.setCustomDraft(raw);
            if (raw.trim() === '') {
              props.setCustomCm('');
              if (props.span === 'custom')
                props.activateDoorTrimMode(props.axis, 'custom', '', props.crossCm);
              return;
            }
            const next = Number(raw);
            if (!Number.isFinite(next) || next < MIN_DOOR_TRIM_CUSTOM_CM || next > MAX_DOOR_TRIM_CUSTOM_CM)
              return;
            props.setCustomCm(next);
            if (props.span === 'custom')
              props.activateDoorTrimMode(props.axis, 'custom', next, props.crossCm);
          }}
          onBlur={() => {
            const raw = props.customDraft.trim();
            if (!raw) {
              props.setCustomCm('');
              props.setCustomDraft('');
              if (props.span === 'custom')
                props.activateDoorTrimMode(props.axis, 'custom', '', props.crossCm);
              return;
            }
            const next = clampDoorTrimInput(
              raw,
              props.customCm,
              MIN_DOOR_TRIM_CUSTOM_CM,
              MIN_DOOR_TRIM_CUSTOM_CM,
              MAX_DOOR_TRIM_CUSTOM_CM
            );
            props.setCustomCm(next);
            props.setCustomDraft(String(next));
            if (props.span === 'custom')
              props.activateDoorTrimMode(props.axis, 'custom', next, props.crossCm);
          }}
        />
        <input
          type="number"
          className="wp-r-input"
          value={props.crossDraft}
          min={MIN_DOOR_TRIM_CROSS_SIZE_CM}
          max={MAX_DOOR_TRIM_CROSS_SIZE_CM}
          step={0.5}
          placeholder={props.crossPlaceholder}
          onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => e.target.select()}
          onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            props.setCrossDraft(raw);
            if (raw.trim() === '') {
              props.setCrossCm('');
              if (props.isDoorTrimMode) {
                props.activateDoorTrimMode(
                  props.axis,
                  props.span,
                  resolveDoorTrimCustomSize(props.span, props.customCm),
                  ''
                );
              }
              return;
            }
            const next = Number(raw);
            if (
              !Number.isFinite(next) ||
              next < MIN_DOOR_TRIM_CROSS_SIZE_CM ||
              next > MAX_DOOR_TRIM_CROSS_SIZE_CM
            )
              return;
            props.setCrossCm(next);
            if (props.isDoorTrimMode) {
              props.activateDoorTrimMode(
                props.axis,
                props.span,
                resolveDoorTrimCustomSize(props.span, props.customCm),
                next
              );
            }
          }}
          onBlur={() => {
            const raw = props.crossDraft.trim();
            if (!raw) {
              props.setCrossCm('');
              props.setCrossDraft('');
              if (props.isDoorTrimMode) {
                props.activateDoorTrimMode(
                  props.axis,
                  props.span,
                  resolveDoorTrimCustomSize(props.span, props.customCm),
                  ''
                );
              }
              return;
            }
            const next = clampDoorTrimInput(
              raw,
              props.crossCm,
              DEFAULT_DOOR_TRIM_CROSS_SIZE_CM,
              MIN_DOOR_TRIM_CROSS_SIZE_CM,
              MAX_DOOR_TRIM_CROSS_SIZE_CM
            );
            props.setCrossCm(next);
            props.setCrossDraft(String(next));
            if (props.isDoorTrimMode) {
              props.activateDoorTrimMode(
                props.axis,
                props.span,
                resolveDoorTrimCustomSize(props.span, props.customCm),
                next
              );
            }
          }}
        />
      </div>
    </>
  );
}
