import type { ChangeEvent, FocusEvent, ReactElement } from 'react';

import {
  SKETCH_DRAWER_HEIGHT_MAX_CM,
  SKETCH_DRAWER_HEIGHT_MIN_CM,
  normalizeSketchDrawerHeightCm,
} from './interior_tab_helpers.js';

export type SketchDrawerHeightDraftController = {
  heightCm: number;
  heightDraft: string;
  defaultHeightCm: number;
  isToolActive: boolean;
  setHeightCm: (next: number) => void;
  setHeightDraft: (next: string) => void;
  onActiveHeightChange: (next: number) => void;
};

export type SketchDrawerHeightFieldProps = {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  onBlur: () => void;
  onReset: () => void;
};

export function updateSketchDrawerHeightDraft(
  controller: SketchDrawerHeightDraftController,
  raw: string
): void {
  controller.setHeightDraft(raw);
  if (raw.trim() === '') return;
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < SKETCH_DRAWER_HEIGHT_MIN_CM || next > SKETCH_DRAWER_HEIGHT_MAX_CM) return;
  controller.setHeightCm(next);
  if (controller.isToolActive) controller.onActiveHeightChange(next);
}

export function commitSketchDrawerHeightDraft(controller: SketchDrawerHeightDraftController): void {
  const next = normalizeSketchDrawerHeightCm(controller.heightDraft, controller.heightCm);
  controller.setHeightCm(next);
  controller.setHeightDraft(String(next));
  if (controller.isToolActive) controller.onActiveHeightChange(next);
}

export function resetSketchDrawerHeightDraft(controller: SketchDrawerHeightDraftController): void {
  const next = controller.defaultHeightCm;
  controller.setHeightCm(next);
  controller.setHeightDraft(String(next));
  if (controller.isToolActive) controller.onActiveHeightChange(next);
}

export function SketchDrawerHeightField(props: SketchDrawerHeightFieldProps): ReactElement {
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
            onFocus={(event: FocusEvent<HTMLInputElement>) => {
              event.target.select();
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              props.onChange(event.target.value);
            }}
            onBlur={props.onBlur}
          />
        </div>
      </div>
    </div>
  );
}
