import type { ReactElement } from 'react';

import { ModeToggleButton } from '../components/index.js';
import {
  CountBtn,
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
  SKETCH_DRAWER_HEIGHT_MAX_CM,
  SKETCH_DRAWER_HEIGHT_MIN_CM,
  SKETCH_TOOL_EXT_DRAWERS_PREFIX,
  cx,
  isSketchInternalDrawersTool,
  normalizeSketchDrawerHeightCm,
} from './interior_tab_helpers.js';
import type { InteriorSketchDrawersSectionProps } from './interior_layout_sketch_section_types.js';

type SketchDrawerHeightFieldProps = {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  onBlur: () => void;
  onReset: () => void;
};

function SketchDrawerHeightField(props: SketchDrawerHeightFieldProps): ReactElement {
  return (
    <div className="wp-field wp-r-sketch-drawer-height-field">
      <div className="wp-r-sketch-drawer-height-row">
        <button
          type="button"
          className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"
          onClick={props.onReset}
        >
          <i className="fas fa-undo-alt" aria-hidden="true" />
          <span>ברירת מחדל</span>
        </button>
        <div className="wp-r-sketch-drawer-height-control">
          <label className="wp-r-label wp-r-label--center wp-r-sketch-drawer-height-label">
            {props.label}
          </label>
          <input
            type="number"
            className="wp-r-input wp-r-sketch-drawer-height-input"
            value={props.value}
            min={SKETCH_DRAWER_HEIGHT_MIN_CM}
            max={SKETCH_DRAWER_HEIGHT_MAX_CM}
            step={0.5}
            onFocus={(event: import('react').FocusEvent<HTMLInputElement>) => {
              event.target.select();
            }}
            onChange={(event: import('react').ChangeEvent<HTMLInputElement>) => {
              props.onChange(event.target.value);
            }}
            onBlur={props.onBlur}
          />
        </div>
      </div>
    </div>
  );
}

function updateSketchExtDrawerHeightDraft(props: InteriorSketchDrawersSectionProps, raw: string): void {
  props.setSketchExtDrawerHeightDraft(raw);
  if (raw.trim() === '') return;
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < SKETCH_DRAWER_HEIGHT_MIN_CM || next > SKETCH_DRAWER_HEIGHT_MAX_CM) return;
  props.setSketchExtDrawerHeightCm(next);
  if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX)) {
    props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, next);
  }
}

function commitSketchExtDrawerHeightDraft(props: InteriorSketchDrawersSectionProps): void {
  const next = normalizeSketchDrawerHeightCm(props.sketchExtDrawerHeightDraft, props.sketchExtDrawerHeightCm);
  props.setSketchExtDrawerHeightCm(next);
  props.setSketchExtDrawerHeightDraft(String(next));
  if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX)) {
    props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, next);
  }
}

function resetSketchExtDrawerHeightDraft(props: InteriorSketchDrawersSectionProps): void {
  const next = DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM;
  props.setSketchExtDrawerHeightCm(next);
  props.setSketchExtDrawerHeightDraft(String(next));
  if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX)) {
    props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, next);
  }
}

function updateSketchIntDrawerHeightDraft(props: InteriorSketchDrawersSectionProps, raw: string): void {
  props.setSketchIntDrawerHeightDraft(raw);
  if (raw.trim() === '') return;
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < SKETCH_DRAWER_HEIGHT_MIN_CM || next > SKETCH_DRAWER_HEIGHT_MAX_CM) return;
  props.setSketchIntDrawerHeightCm(next);
  if (props.isSketchToolActive && isSketchInternalDrawersTool(props.manualToolRaw)) {
    props.enterSketchIntDrawersTool(next);
  }
}

function commitSketchIntDrawerHeightDraft(props: InteriorSketchDrawersSectionProps): void {
  const next = normalizeSketchDrawerHeightCm(props.sketchIntDrawerHeightDraft, props.sketchIntDrawerHeightCm);
  props.setSketchIntDrawerHeightCm(next);
  props.setSketchIntDrawerHeightDraft(String(next));
  if (props.isSketchToolActive && isSketchInternalDrawersTool(props.manualToolRaw)) {
    props.enterSketchIntDrawersTool(next);
  }
}

function resetSketchIntDrawerHeightDraft(props: InteriorSketchDrawersSectionProps): void {
  const next = DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM;
  props.setSketchIntDrawerHeightCm(next);
  props.setSketchIntDrawerHeightDraft(String(next));
  if (props.isSketchToolActive && isSketchInternalDrawersTool(props.manualToolRaw)) {
    props.enterSketchIntDrawersTool(next);
  }
}

export function InteriorSketchDrawersSection(props: InteriorSketchDrawersSectionProps): ReactElement {
  const { isSketchExtDrawersControlsOpen } = props;
  const isSketchExternalDrawersToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX);
  const isSketchInternalDrawersToolActive =
    props.isSketchToolActive && isSketchInternalDrawersTool(props.manualToolRaw);

  return (
    <>
      <div className="wp-field">
        <div className="wp-r-label wp-r-label--center">מגירות חיצוניות לפי סקיצה</div>
        <div className="wp-r-type-selector type-selector" style={{ direction: 'rtl' }}>
          <ModeToggleButton
            active={isSketchExternalDrawersToolActive}
            icon={
              <i
                className={isSketchExternalDrawersToolActive ? 'fas fa-check' : 'fas fa-layer-group'}
                aria-hidden="true"
              />
            }
            onClick={() => {
              props.setSketchShelvesOpen(false);
              if (isSketchExternalDrawersToolActive) {
                props.setSketchExtDrawersPanelOpen(false);
                props.exitManual();
                return;
              }
              props.setSketchExtDrawersPanelOpen(true);
              props.enterSketchExtDrawersTool(props.sketchExtDrawerCount, props.sketchExtDrawerHeightCm);
            }}
          >
            הוסף/הסר מגירות חיצוניות
            <i
              className={cx(
                'fas',
                props.sketchExtDrawersPanelOpen ? 'fa-chevron-up' : 'fa-chevron-down',
                'wp-chevron'
              )}
              aria-hidden="true"
            />
          </ModeToggleButton>
        </div>

        <div
          className={cx('wp-row', 'wp-gap-5', isSketchExtDrawersControlsOpen ? '' : 'hidden')}
          style={{ marginTop: 8, marginBottom: 10 }}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <CountBtn
              key={n}
              selected={isSketchExternalDrawersToolActive && props.sketchExtDrawerCount === n}
              onClick={() => {
                props.setSketchExtDrawerCount(n);
                props.setSketchExtDrawersPanelOpen(true);
                props.enterSketchExtDrawersTool(n, props.sketchExtDrawerHeightCm);
              }}
            >
              {n}
            </CountBtn>
          ))}
        </div>
        <div className={cx(isSketchExtDrawersControlsOpen ? '' : 'hidden')}>
          <SketchDrawerHeightField
            label={'גובה מגירה חיצונית (ס"מ)'}
            value={props.sketchExtDrawerHeightDraft}
            onChange={raw => {
              updateSketchExtDrawerHeightDraft(props, raw);
            }}
            onBlur={() => {
              commitSketchExtDrawerHeightDraft(props);
            }}
            onReset={() => {
              resetSketchExtDrawerHeightDraft(props);
            }}
          />
        </div>
      </div>

      <div className="wp-field">
        <div className="wp-r-label wp-r-label--center">מגירות פנימיות לפי סקיצה</div>
        <div className="wp-r-type-selector type-selector" style={{ direction: 'rtl' }}>
          <ModeToggleButton
            active={isSketchInternalDrawersToolActive}
            icon={
              <i
                className={isSketchInternalDrawersToolActive ? 'fas fa-check' : 'fas fa-box-open'}
                aria-hidden="true"
              />
            }
            onClick={() => {
              props.setSketchShelvesOpen(false);
              if (isSketchInternalDrawersToolActive) props.exitManual();
              else props.enterSketchIntDrawersTool(props.sketchIntDrawerHeightCm);
            }}
          >
            הוסף/הסר מגירות פנימיות
          </ModeToggleButton>
        </div>
        <SketchDrawerHeightField
          label={'גובה מגירה פנימית (ס"מ)'}
          value={props.sketchIntDrawerHeightDraft}
          onChange={raw => {
            updateSketchIntDrawerHeightDraft(props, raw);
          }}
          onBlur={() => {
            commitSketchIntDrawerHeightDraft(props);
          }}
          onReset={() => {
            resetSketchIntDrawerHeightDraft(props);
          }}
        />
      </div>

      {props.isSketchToolActive ? (
        <ModeToggleButton
          active={true}
          className="wp-r-editmode-toggle--fullrow"
          icon={<i className="fas fa-times" aria-hidden="true" />}
          onClick={() => {
            props.setSketchShelvesOpen(false);
            props.exitManual();
          }}
        >
          סיים מצב עריכה
        </ModeToggleButton>
      ) : null}
    </>
  );
}
