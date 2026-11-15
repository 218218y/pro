import type { ReactElement } from 'react';

import { buildScopedFormFieldId } from '../components/form_field_id.js';

import { Button, ModeToggleButton, OptionButton } from '../components/index.js';
import {
  DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM,
  DEFAULT_SKETCH_SHELF_DEPTH_OVERRIDE,
  DEFAULT_SKETCH_STORAGE_HEIGHT_CM,
} from './interior_tab_local_state_shared.js';
import {
  SKETCH_TOOL_ROD,
  SKETCH_TOOL_SHELF_PREFIX,
  SKETCH_TOOL_STORAGE_PREFIX,
  clampSketch,
  cx,
  mkSketchShelfTool,
  mkSketchStorageTool,
  parseSketchShelfVariant,
} from './interior_tab_helpers.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';
import { SHELF_VARIANT_OPTIONS } from './interior_layout_shelf_variant_options.js';

export { SHELF_VARIANT_OPTIONS } from './interior_layout_shelf_variant_options.js';

const SKETCH_SHELF_DEPTH_MIN_CM = 5;
const SKETCH_SHELF_DEPTH_MAX_CM = 120;
const SKETCH_SHELF_DEPTH_STEP_CM = 5;
const SKETCH_STORAGE_HEIGHT_MIN_CM = 5;
const SKETCH_STORAGE_HEIGHT_MAX_CM = 120;

function SketchFieldResetButton(props: { onClick: () => void; testId: string }): ReactElement {
  return (
    <Button
      variant="light"
      inline
      className="wp-r-groove-reset-btn wp-r-sketch-drawer-height-reset-btn"
      onClick={props.onClick}
      data-testid={props.testId}
    >
      <i className="fas fa-undo-alt" aria-hidden="true" />
      <span>ברירת מחדל</span>
    </Button>
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
  const activeShelfVariant = props.isSketchToolActive ? parseSketchShelfVariant(props.manualToolRaw) : null;
  const isShelfSelected = SHELF_VARIANT_OPTIONS.some(option => option.variant === activeShelfVariant);
  const preferredShelfVariant =
    SHELF_VARIANT_OPTIONS.find(option => option.variant === props.gridShelfVariant)?.variant ?? 'regular';

  function selectShelf(variant: (typeof SHELF_VARIANT_OPTIONS)[number]['variant']): void {
    props.setGridShelfVariant(variant);
    props.enterSketchShelfTool(variant);
  }

  return (
    <div className="wp-field">
      <div className="wp-r-label wp-r-label--center">מדפים ותלייה</div>
      <div className="wp-sketch-shelf-tools-grid" role="group" aria-label="מדפים ותלייה לפי סקיצה" dir="rtl">
        <OptionButton
          density="micro"
          selected={isShelfSelected}
          aria-expanded={isShelfSelected}
          {...(isShelfSelected ? { 'aria-controls': 'wp-sketch-shelf-variant-options' } : {})}
          icon={<i className="fas fa-layer-group" aria-hidden="true" />}
          testId="sketch-shelf-tool-main"
          onClick={() => {
            if (isShelfSelected) props.exitManual();
            else selectShelf(preferredShelfVariant);
          }}
        >
          מדף
        </OptionButton>
        <OptionButton
          density="micro"
          selected={props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_ROD}
          icon={<i className="fas fa-tshirt" aria-hidden="true" />}
          testId="sketch-shelf-tool-rod"
          onClick={() => {
            if (props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_ROD) props.exitManual();
            else props.activateManualToolId(SKETCH_TOOL_ROD);
          }}
        >
          מוט תלייה
        </OptionButton>
        <OptionButton
          density="micro"
          selected={props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX)}
          icon={<i className="fas fa-box-open" aria-hidden="true" />}
          testId="sketch-shelf-tool-storage"
          onClick={() => {
            if (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_STORAGE_PREFIX))
              props.exitManual();
            else props.activateManualToolId(mkSketchStorageTool(props.sketchStorageHeightCm));
          }}
        >
          אוגר מצעים
        </OptionButton>
        <WinterBraceShelfButton
          props={props}
          active={activeShelfVariant === 'winter_brace'}
          onSelect={() => {
            if (activeShelfVariant === 'winter_brace') props.exitManual();
            else props.enterSketchShelfTool('winter_brace');
          }}
        />
        <OptionButton
          density="micro"
          selected={props.isLayoutMode && props.layoutType === 'full_boring'}
          icon={<i className="fas fa-grip-vertical" aria-hidden="true" />}
          testId="sketch-layout-full_boring"
          onClick={() => props.enterLayout('full_boring')}
        >
          חירור מלא
        </OptionButton>
      </div>
      {isShelfSelected ? (
        <div className="wp-sketch-shelf-variant-settings">
          <span className="wp-interior-layout-label">סוג מדף</span>
          <div
            className="wp-sketch-shelf-variant-options"
            id="wp-sketch-shelf-variant-options"
            role="group"
            aria-label="סוג מדף"
            dir="rtl"
          >
            {SHELF_VARIANT_OPTIONS.map(({ variant, label, icon }) => (
              <OptionButton
                key={variant}
                density="micro"
                selected={activeShelfVariant === variant}
                icon={<i className={icon} aria-hidden="true" />}
                testId={`sketch-shelf-tool-${variant}`}
                onClick={() => selectShelf(variant)}
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </div>
      ) : null}
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
              activeSketchShelfVariant === 'brace' || activeSketchShelfVariant === 'winter_brace'
                ? 'מלא'
                : String(DEFAULT_SKETCH_SHELF_DEPTH_EDIT_CM)
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
            data-testid="interior-sketch-storage-height-input"
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

function WinterBraceDoorLockButton(props: InteriorLayoutSectionProps): ReactElement | null {
  if (!props.hasWinterBrace) return null;
  return (
    <ModeToggleButton
      active={props.winterBraceDoorsLocked}
      className="wp-sketch-shelf-btn wp-winter-brace-lock-icon"
      data-testid="winter-brace-door-lock-button"
      aria-label={props.winterBraceDoorsLocked ? 'דלתות נעולות' : 'דלתות משוחררות'}
      title={props.winterBraceDoorsLocked ? 'שחרור דלתות קושרת חורף' : 'נעילת דלתות קושרת חורף'}
      icon={
        <i className={props.winterBraceDoorsLocked ? 'fas fa-lock' : 'fas fa-lock-open'} aria-hidden="true" />
      }
      onClick={props.toggleWinterBraceDoorLock}
    >
      {null}
    </ModeToggleButton>
  );
}

type WinterBraceShelfButtonProps = {
  props: InteriorLayoutSectionProps;
  active: boolean;
  onSelect: () => void;
};

export function WinterBraceShelfButton({
  props,
  active,
  onSelect,
}: WinterBraceShelfButtonProps): ReactElement {
  return (
    <div
      className={cx('wp-winter-brace-control', active && 'is-active')}
      role="group"
      aria-label="קושרת חורף"
      data-testid="winter-brace-combined-button"
      dir="rtl"
    >
      <ModeToggleButton
        active={active}
        className="wp-sketch-shelf-btn wp-winter-brace-main"
        data-testid="winter-brace-shelf-button"
        icon={<i className="far fa-square" aria-hidden="true" />}
        onClick={onSelect}
      >
        קושרת חורף
      </ModeToggleButton>
      <WinterBraceDoorLockButton {...props} />
    </div>
  );
}

export function WinterBraceShelfControls(props: WinterBraceShelfButtonProps): ReactElement {
  return (
    <div className="wp-winter-brace-row">
      <WinterBraceShelfButton {...props} />
    </div>
  );
}
