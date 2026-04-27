import type { ReactElement } from 'react';

import { ModeToggleButton } from '../components/index.js';
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
  parseSketchShelfVariant,
} from './interior_tab_helpers.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';

const SKETCH_SHELF_VARIANTS: ReadonlyArray<[string, string, string, string]> = [
  [SKETCH_TOOL_SHELF_REGULAR, 'regular', 'רגיל', 'fas fa-minus'],
  [SKETCH_TOOL_SHELF_DOUBLE, 'double', 'כפול', 'fas fa-clone'],
  [SKETCH_TOOL_SHELF_GLASS, 'glass', 'זכוכית', 'fas fa-gem'],
  [SKETCH_TOOL_SHELF_BRACE, 'brace', 'קושרת', 'fas fa-link'],
];

export function InteriorSketchShelvesSection(props: InteriorLayoutSectionProps): ReactElement {
  const activeSketchShelfVariant = parseSketchShelfVariant(props.manualToolRaw);
  const activeSketchShelfDepthDraft = activeSketchShelfVariant
    ? props.sketchShelfDepthDraftByVariant[activeSketchShelfVariant] || ''
    : '';

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
            else
              props.activateManualToolId(
                `${SKETCH_TOOL_STORAGE_PREFIX}${clampSketch(props.sketchStorageHeightCm, 5, 120)}`
              );
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

      <div
        className={cx(
          'wp-sketch-storage-input',
          props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_SHELF_PREFIX) ? '' : 'hidden'
        )}
      >
        <label className="wp-r-label wp-r-label--center" style={{ marginBottom: 6 }}>
          עומק מדף (ס"מ)
        </label>
        <input
          type="number"
          className="wp-r-input"
          value={activeSketchShelfDepthDraft}
          min={5}
          max={120}
          step={1}
          placeholder={activeSketchShelfVariant === 'brace' ? 'מלא' : '45'}
          onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => {
            e.target.select();
          }}
          onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
            const variant = parseSketchShelfVariant(props.manualToolRaw);
            if (!variant) return;

            const raw = e.target.value;
            props.setSketchShelfDepthDraftByVariant(prev => ({ ...prev, [variant]: raw }));
            if (raw === '') {
              props.setSketchShelfDepthByVariant(prev => ({ ...prev, [variant]: '' }));
              props.activateManualToolId(mkSketchShelfTool(variant, null));
              return;
            }

            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            if (n < 5 || n > 120) return;
            props.setSketchShelfDepthByVariant(prev => ({ ...prev, [variant]: n }));
            props.activateManualToolId(mkSketchShelfTool(variant, n));
          }}
          onBlur={() => {
            const variant = parseSketchShelfVariant(props.manualToolRaw);
            if (!variant) return;
            const raw = props.sketchShelfDepthDraftByVariant[variant];
            if (typeof raw !== 'string' || raw.trim() === '') {
              props.setSketchShelfDepthByVariant(prev => ({ ...prev, [variant]: '' }));
              props.setSketchShelfDepthDraftByVariant(prev => ({ ...prev, [variant]: '' }));
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

            const next = clampSketch(n, 5, 120);
            props.setSketchShelfDepthByVariant(prev => ({ ...prev, [variant]: next }));
            props.setSketchShelfDepthDraftByVariant(prev => ({ ...prev, [variant]: String(next) }));
            props.activateManualToolId(mkSketchShelfTool(variant, next));
          }}
        />
      </div>

      <div
        className={cx(
          'wp-sketch-storage-input',
          props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)
            ? ''
            : 'hidden'
        )}
      >
        <label className="wp-r-label wp-r-label--center" style={{ marginBottom: 6 }}>
          גובה אוגר מצעים (ס"מ)
        </label>
        <input
          type="number"
          className="wp-r-input"
          value={props.sketchStorageHeightDraft}
          min={5}
          max={120}
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
            if (n < 5 || n > 120) return;

            props.setSketchStorageHeightCm(n);
            if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)) {
              props.activateManualToolId(`${SKETCH_TOOL_STORAGE_PREFIX}${n}`);
            }
          }}
          onBlur={() => {
            const raw = props.sketchStorageHeightDraft;
            const n = Number(raw);
            const next = Number.isFinite(n)
              ? clampSketch(n, 5, 120)
              : clampSketch(props.sketchStorageHeightCm, 5, 120);
            props.setSketchStorageHeightCm(next);
            props.setSketchStorageHeightDraft(String(next));
            if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)) {
              props.activateManualToolId(`${SKETCH_TOOL_STORAGE_PREFIX}${next}`);
            }
          }}
        />
      </div>
    </div>
  );
}
