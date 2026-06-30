import type { ReactElement } from 'react';

import { buildScopedFormFieldId } from '../components/form_field_id.js';

import { ModeToggleButton } from '../components/index.js';
import {
  DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM,
  DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
  DEFAULT_SKETCH_STORAGE_HEIGHT_CM,
} from './interior_tab_local_state_shared.js';
import {
  SKETCH_TOOL_ROD,
  SKETCH_TOOL_SHELF_BRACE,
  SKETCH_TOOL_SHELF_DOUBLE,
  SKETCH_TOOL_SHELF_GLASS,
  SKETCH_TOOL_SHELF_PREFIX,
  SKETCH_TOOL_SHELF_REGULAR,
  SKETCH_TOOL_STORAGE_PREFIX,
  clampSketch,
  cx,
  mkSketchShelfTool,
  mkSketchStorageTool,
  parseSketchShelfVariant,
} from './interior_tab_helpers.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';

const SKETCH_SHELF_VARIANTS: ReadonlyArray<[string, string, string, string]> = [
  [SKETCH_TOOL_SHELF_REGULAR, 'regular', 'רגיל', 'fas fa-minus'],
  [SKETCH_TOOL_SHELF_DOUBLE, 'double', 'כפול', 'fas fa-clone'],
  [SKETCH_TOOL_SHELF_GLASS, 'glass', 'זכוכית', 'fas fa-gem'],
  [SKETCH_TOOL_SHELF_BRACE, 'brace', 'קושרת', 'fas fa-link'],
];

const SKETCH_SHELF_DEPTH_MIN_CM = 5;
const SKETCH_SHELF_DEPTH_MAX_CM = 120;
const SKETCH_SHELF_DEPTH_STEP_CM = 5;
const SKETCH_STORAGE_HEIGHT_MIN_CM = 5;
const SKETCH_STORAGE_HEIGHT_MAX_CM = 120;

function SketchFieldResetButton(props: { onClick: () => void; testId: string }): ReactElement {
  return (
    <button
      type="button"
      className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"
      onClick={props.onClick}
      data-testid={props.testId}
    >
      <i className="fas fa-undo-alt" aria-hidden="true" />
      <span>ברירת מחדל</span>
    </button>
  );
}

function resetSketchShelfDepth(props: InteriorLayoutSectionProps): void {
  const variant = parseSketchShelfVariant(props.manualToolRaw);
  if (!variant) return;

  props.setSketchShelfDepthByVariant(prev => ({
    ...prev,
    [variant]: DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
  }));
  props.setSketchShelfDepthDraftByVariant(prev => ({
    ...prev,
    [variant]: DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
  }));
  props.activateManualToolId(mkSketchShelfTool(variant, null));
}

function resetSketchStorageHeight(props: InteriorLayoutSectionProps): void {
  const next = DEFAULT_SKETCH_STORAGE_HEIGHT_CM;
  props.setSketchStorageHeightCm(next);
  props.setSketchStorageHeightDraft(String(next));
  if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)) {
    props.activateManualToolId(mkSketchStorageTool(next));
  }
}

export function InteriorSketchShelvesSection(props: InteriorLayoutSectionProps): ReactElement {
  return (
    <div className="wp-field">
      <div className="wp-r-label wp-r-label--center">מדפים ותלייה</div>

      <div className="wp-r-type-selector type-selector wp-sketch-shelf-headrow" style={{ direction: 'rtl' }}>
        <ModeToggleButton
          active={props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_SHELF_PREFIX)}
          className="wp-sketch-shelf-btn wp-sketch-shelf-group-btn"
          icon={
            <i
              className={
                props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_SHELF_PREFIX)
                  ? 'fas fa-check'
                  : 'fas fa-th-large'
              }
              aria-hidden="true"
            />
          }
          onClick={() => {
            const isOn = props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_SHELF_PREFIX);
            if (isOn) {
              props.setSketchShelvesOpen(false);
              props.exitManual();
              return;
            }
            props.setSketchShelvesOpen(true);
            props.enterSketchShelfTool('regular');
          }}
        >
          מדפים
          <i
            className={cx('fas', props.sketchShelvesOpen ? 'fa-chevron-up' : 'fa-chevron-down', 'wp-chevron')}
            aria-hidden="true"
          />
        </ModeToggleButton>

        <ModeToggleButton
          active={props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_ROD}
          className="wp-sketch-shelf-btn"
          icon={
            <i
              className={
                props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_ROD
                  ? 'fas fa-check'
                  : 'fas fa-tshirt'
              }
              aria-hidden="true"
            />
          }
          onClick={() => {
            props.setSketchShelvesOpen(false);
            const isOn = props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_ROD;
            if (isOn) props.exitManual();
            else props.activateManualToolId(SKETCH_TOOL_ROD);
          }}
        >
          תלייה
        </ModeToggleButton>

        <ModeToggleButton
          active={props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)}
          className="wp-sketch-shelf-btn"
          icon={
            <i
              className={
                props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)
                  ? 'fas fa-check'
                  : 'fas fa-box-open'
              }
              aria-hidden="true"
            />
          }
          onClick={() => {
            props.setSketchShelvesOpen(false);
            const isOn =
              props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX);
            if (isOn) props.exitManual();
            else props.activateManualToolId(mkSketchStorageTool(props.sketchStorageHeightCm));
          }}
        >
          אוגר מצעים
        </ModeToggleButton>
      </div>

      <div
        className={cx(
          'wp-r-type-selector',
          'type-selector',
          'wp-sketch-shelf-subrow',
          props.sketchShelvesOpen ? '' : 'hidden'
        )}
        style={{ direction: 'rtl' }}
      >
        {SKETCH_SHELF_VARIANTS.map(([prefix, variant, label, icon]) => (
          <ModeToggleButton
            key={variant}
            active={props.isSketchToolActive && props.manualToolRaw.startsWith(prefix)}
            className="wp-sketch-shelf-btn wp-sketch-shelf-subbtn"
            icon={
              <i
                className={
                  props.isSketchToolActive && props.manualToolRaw.startsWith(prefix) ? 'fas fa-check' : icon
                }
                aria-hidden="true"
              />
            }
            onClick={() => {
              const isOn = props.isSketchToolActive && props.manualToolRaw.startsWith(prefix);
              if (isOn) {
                props.setSketchShelvesOpen(false);
                props.exitManual();
                return;
              }
              props.setSketchShelvesOpen(true);
              props.activateManualToolId(mkSketchShelfTool(variant, null));
            }}
          >
            {label}
          </ModeToggleButton>
        ))}
      </div>

      <InteriorSketchShelfDepthField {...props} />
      <InteriorSketchStorageHeightField {...props} />
    </div>
  );
}

export function InteriorSketchShelfDepthField(props: InteriorLayoutSectionProps): ReactElement {
  const shelfDepthInputId = buildScopedFormFieldId('wp-r-sketch-shelf-depth', props.formFieldIdScope);
  const activeSketchShelfVariant = parseSketchShelfVariant(props.manualToolRaw);
  const activeSketchShelfDepthDraft = activeSketchShelfVariant
    ? props.sketchShelfDepthDraftByVariant[activeSketchShelfVariant] || ''
    : '';

  return (
    <div
      className={cx(
        'wp-sketch-storage-input',
        props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_SHELF_PREFIX) ? '' : 'hidden'
      )}
    >
      <div className="wp-r-sketch-drawer-height-row">
        <SketchFieldResetButton
          onClick={() => {
            resetSketchShelfDepth(props);
          }}
          testId="interior-sketch-shelf-depth-reset-button"
        />
        <div className="wp-r-sketch-drawer-height-control">
          <label
            className="wp-r-label wp-r-label--center wp-r-sketch-drawer-height-label"
            htmlFor={shelfDepthInputId}
          >
            עומק מדף (ס"מ)
          </label>
          <input
            id={shelfDepthInputId}
            name={shelfDepthInputId}
            type="number"
            className="wp-r-input wp-r-sketch-drawer-height-input"
            value={activeSketchShelfDepthDraft}
            min={SKETCH_SHELF_DEPTH_MIN_CM}
            max={SKETCH_SHELF_DEPTH_MAX_CM}
            step={SKETCH_SHELF_DEPTH_STEP_CM}
            placeholder={
              activeSketchShelfVariant === 'brace' ? 'מלא' : String(DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM)
            }
            data-testid="interior-sketch-shelf-depth-input"
            onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => {
              const variant = parseSketchShelfVariant(props.manualToolRaw);
              if (variant) {
                const draft = props.sketchShelfDepthDraftByVariant[variant];
                if (typeof draft !== 'string' || draft.trim() === '') {
                  const currentDepth = props.sketchShelfDepthByVariant[variant];
                  const editStart =
                    typeof currentDepth === 'number' && Number.isFinite(currentDepth)
                      ? currentDepth
                      : DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM;
                  props.setSketchShelfDepthDraftByVariant(prev => ({
                    ...prev,
                    [variant]: String(editStart),
                  }));
                }
              }
              e.target.select();
            }}
            onClick={(e: import('react').MouseEvent<HTMLInputElement>) => {
              e.currentTarget.select();
            }}
            onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
              const variant = parseSketchShelfVariant(props.manualToolRaw);
              if (!variant) return;

              const raw = e.target.value;
              const currentDraft = props.sketchShelfDepthDraftByVariant[variant];
              const currentDepth = props.sketchShelfDepthByVariant[variant];
              const nextRaw =
                (typeof currentDraft !== 'string' || currentDraft.trim() === '') &&
                currentDepth === DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE &&
                raw === String(SKETCH_SHELF_DEPTH_MIN_CM)
                  ? String(DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM)
                  : raw;
              props.setSketchShelfDepthDraftByVariant(prev => ({ ...prev, [variant]: nextRaw }));
              if (nextRaw === '') {
                props.setSketchShelfDepthByVariant(prev => ({
                  ...prev,
                  [variant]: DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
                }));
                props.activateManualToolId(mkSketchShelfTool(variant, null));
                return;
              }

              const n = Number(nextRaw);
              if (!Number.isFinite(n)) return;
              if (n < SKETCH_SHELF_DEPTH_MIN_CM || n > SKETCH_SHELF_DEPTH_MAX_CM) return;
              props.setSketchShelfDepthByVariant(prev => ({ ...prev, [variant]: n }));
              props.activateManualToolId(mkSketchShelfTool(variant, n));
            }}
            onBlur={() => {
              const variant = parseSketchShelfVariant(props.manualToolRaw);
              if (!variant) return;
              const raw = props.sketchShelfDepthDraftByVariant[variant];
              const currentDepth = props.sketchShelfDepthByVariant[variant];
              if (
                currentDepth === DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE &&
                typeof raw === 'string' &&
                raw.trim() === String(DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM)
              ) {
                props.setSketchShelfDepthDraftByVariant(prev => ({
                  ...prev,
                  [variant]: DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
                }));
                return;
              }
              if (typeof raw !== 'string' || raw.trim() === '') {
                props.setSketchShelfDepthByVariant(prev => ({
                  ...prev,
                  [variant]: DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
                }));
                props.setSketchShelfDepthDraftByVariant(prev => ({
                  ...prev,
                  [variant]: DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
                }));
                props.activateManualToolId(mkSketchShelfTool(variant, null));
                return;
              }

              const n = Number(raw);
              if (!Number.isFinite(n)) {
                const back = props.sketchShelfDepthByVariant[variant];
                props.setSketchShelfDepthDraftByVariant(prev => ({
                  ...prev,
                  [variant]: typeof back === 'number' && Number.isFinite(back) ? String(back) : '',
                }));
                return;
              }

              const next = clampSketch(n, SKETCH_SHELF_DEPTH_MIN_CM, SKETCH_SHELF_DEPTH_MAX_CM);
              props.setSketchShelfDepthByVariant(prev => ({ ...prev, [variant]: next }));
              props.setSketchShelfDepthDraftByVariant(prev => ({ ...prev, [variant]: String(next) }));
              props.activateManualToolId(mkSketchShelfTool(variant, next));
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function InteriorSketchStorageHeightField(props: InteriorLayoutSectionProps): ReactElement {
  const storageHeightInputId = buildScopedFormFieldId('wp-r-sketch-storage-height', props.formFieldIdScope);

  return (
    <div
      className={cx(
        'wp-sketch-storage-input',
        props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX) ? '' : 'hidden'
      )}
    >
      <div className="wp-r-sketch-drawer-height-row">
        <SketchFieldResetButton
          onClick={() => {
            resetSketchStorageHeight(props);
          }}
          testId="interior-sketch-storage-height-reset-button"
        />
        <div className="wp-r-sketch-drawer-height-control">
          <label
            className="wp-r-label wp-r-label--center wp-r-sketch-drawer-height-label"
            htmlFor={storageHeightInputId}
          >
            גובה אוגר מצעים (ס"מ)
          </label>
          <input
            id={storageHeightInputId}
            name={storageHeightInputId}
            type="number"
            className="wp-r-input wp-r-sketch-drawer-height-input"
            value={props.sketchStorageHeightDraft}
            min={SKETCH_STORAGE_HEIGHT_MIN_CM}
            max={SKETCH_STORAGE_HEIGHT_MAX_CM}
            step={5}
            onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => {
              e.target.select();
            }}
            onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
              const raw = e.target.value;
              props.setSketchStorageHeightDraft(raw);
              if (raw.trim() === '') return;

              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              if (n < SKETCH_STORAGE_HEIGHT_MIN_CM || n > SKETCH_STORAGE_HEIGHT_MAX_CM) return;

              props.setSketchStorageHeightCm(n);
              if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)) {
                props.activateManualToolId(mkSketchStorageTool(n));
              }
            }}
            onBlur={() => {
              const raw = props.sketchStorageHeightDraft;
              const n = Number(raw);
              const next = Number.isFinite(n)
                ? clampSketch(n, SKETCH_STORAGE_HEIGHT_MIN_CM, SKETCH_STORAGE_HEIGHT_MAX_CM)
                : clampSketch(
                    props.sketchStorageHeightCm,
                    SKETCH_STORAGE_HEIGHT_MIN_CM,
                    SKETCH_STORAGE_HEIGHT_MAX_CM
                  );
              props.setSketchStorageHeightCm(next);
              props.setSketchStorageHeightDraft(String(next));
              if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)) {
                props.activateManualToolId(mkSketchStorageTool(next));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
