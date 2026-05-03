import {
  SKETCH_BOX_HEIGHT_MAX_CM,
  SKETCH_BOX_HEIGHT_MIN_CM,
  SKETCH_BOX_OPTIONAL_DIM_MAX_CM,
  SKETCH_BOX_OPTIONAL_DIM_MIN_CM,
  clampSketch,
} from './interior_tab_helpers.js';
import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';
import type {
  OptionalDimensionField,
  SketchBoxOptionalDimensionValue,
} from './interior_layout_sketch_box_controls_runtime_types.js';
import { syncSketchBoxTool } from './interior_layout_sketch_box_controls_runtime_sync.js';

const OPTIONAL_DIM_BOUNDS: Readonly<{ min: number; max: number }> = {
  min: SKETCH_BOX_OPTIONAL_DIM_MIN_CM,
  max: SKETCH_BOX_OPTIONAL_DIM_MAX_CM,
};

export function updateSketchBoxHeightDraft(props: InteriorSketchBoxControlsSectionProps, raw: string): void {
  props.setSketchBoxHeightDraft(raw);
  if (raw.trim() === '') return;

  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < SKETCH_BOX_HEIGHT_MIN_CM || next > SKETCH_BOX_HEIGHT_MAX_CM) return;

  props.setSketchBoxHeightCm(next);
  syncSketchBoxTool(props, next, props.sketchBoxWidthCm, props.sketchBoxDepthCm);
}

export function commitSketchBoxHeightDraft(props: InteriorSketchBoxControlsSectionProps): void {
  const raw = props.sketchBoxHeightDraft;
  const n = Number(raw);
  const next = Number.isFinite(n)
    ? clampSketch(n, SKETCH_BOX_HEIGHT_MIN_CM, SKETCH_BOX_HEIGHT_MAX_CM)
    : clampSketch(props.sketchBoxHeightCm, SKETCH_BOX_HEIGHT_MIN_CM, SKETCH_BOX_HEIGHT_MAX_CM);
  props.setSketchBoxHeightCm(next);
  props.setSketchBoxHeightDraft(String(next));
  syncSketchBoxTool(props, next, props.sketchBoxWidthCm, props.sketchBoxDepthCm);
}

export function updateSketchBoxOptionalDimensionDraft(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField,
  raw: string
): void {
  setOptionalDimensionDraft(props, field, raw);

  if (raw.trim() === '') {
    applyOptionalDimensionValue(props, field, '');
    return;
  }

  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < OPTIONAL_DIM_BOUNDS.min || next > OPTIONAL_DIM_BOUNDS.max) return;

  applyOptionalDimensionValue(props, field, next);
}

export function commitSketchBoxOptionalDimensionDraft(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField
): void {
  const raw = getOptionalDimensionDraft(props, field).trim();
  if (!raw) {
    setOptionalDimensionValue(props, field, '');
    setOptionalDimensionDraft(props, field, '');
    applyOptionalDimensionValue(props, field, '');
    return;
  }

  const parsed = Number(raw);
  const current = getOptionalDimensionValue(props, field);
  const next = Number.isFinite(parsed)
    ? clampSketch(parsed, OPTIONAL_DIM_BOUNDS.min, OPTIONAL_DIM_BOUNDS.max)
    : typeof current === 'number'
      ? clampSketch(current, OPTIONAL_DIM_BOUNDS.min, OPTIONAL_DIM_BOUNDS.max)
      : '';

  setOptionalDimensionValue(props, field, next);
  setOptionalDimensionDraft(props, field, typeof next === 'number' ? String(next) : '');
  applyOptionalDimensionValue(props, field, next);
}

function applyOptionalDimensionValue(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField,
  next: SketchBoxOptionalDimensionValue
): void {
  setOptionalDimensionValue(props, field, next);
  syncSketchBoxTool(
    props,
    props.sketchBoxHeightCm,
    field === 'width' ? next : props.sketchBoxWidthCm,
    field === 'depth' ? next : props.sketchBoxDepthCm
  );
}

function getOptionalDimensionDraft(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField
): string {
  return field === 'width' ? props.sketchBoxWidthDraft : props.sketchBoxDepthDraft;
}

function getOptionalDimensionValue(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField
): SketchBoxOptionalDimensionValue {
  return field === 'width' ? props.sketchBoxWidthCm : props.sketchBoxDepthCm;
}

function setOptionalDimensionDraft(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField,
  raw: string
): void {
  if (field === 'width') props.setSketchBoxWidthDraft(raw);
  else props.setSketchBoxDepthDraft(raw);
}

function setOptionalDimensionValue(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField,
  next: SketchBoxOptionalDimensionValue
): void {
  if (field === 'width') props.setSketchBoxWidthCm(next);
  else props.setSketchBoxDepthCm(next);
}
