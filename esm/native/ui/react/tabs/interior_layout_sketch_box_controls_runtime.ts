import type {
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';
import {
  SKETCH_BOX_HEIGHT_MAX_CM,
  SKETCH_BOX_HEIGHT_MIN_CM,
  SKETCH_BOX_OPTIONAL_DIM_MAX_CM,
  SKETCH_BOX_OPTIONAL_DIM_MIN_CM,
  clampSketch,
} from './interior_tab_helpers.js';
import {
  BASE_LEG_HEIGHT_MAX_CM,
  BASE_LEG_HEIGHT_MIN_CM,
  BASE_LEG_WIDTH_MAX_CM,
  BASE_LEG_WIDTH_MIN_CM,
  normalizeBaseLegHeightCm,
  normalizeBaseLegWidthCm,
} from '../../../features/base_leg_support.js';
import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';

type OptionalDimensionField = 'width' | 'depth';
type SketchBoxToolId = 'divider' | 'door' | 'doorHinge' | 'doubleDoor';

const OPTIONAL_DIM_BOUNDS: Readonly<{ min: number; max: number }> = {
  min: SKETCH_BOX_OPTIONAL_DIM_MIN_CM,
  max: SKETCH_BOX_OPTIONAL_DIM_MAX_CM,
};

export function toggleSketchBoxControlsPanel(
  props: InteriorSketchBoxControlsSectionProps,
  isSketchBoxControlsOpen: boolean,
  isSketchBoxToolActive: boolean
): void {
  props.setSketchShelvesOpen(false);
  if (isSketchBoxControlsOpen) {
    props.setSketchBoxPanelOpen(false);
    props.setSketchBoxBasePanelOpen(false);
    props.setSketchBoxCornicePanelOpen(false);
    if (isSketchBoxToolActive) props.exitManual();
    return;
  }
  syncSketchBoxTool(props, props.sketchBoxHeightCm, props.sketchBoxWidthCm, props.sketchBoxDepthCm);
}

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

export function toggleSketchBoxTool(
  props: InteriorSketchBoxControlsSectionProps,
  tool: SketchBoxToolId,
  toolId: string,
  isActive: boolean
): void {
  props.setSketchShelvesOpen(false);
  if (isActive) {
    props.exitManual();
    return;
  }
  props.setSketchBoxPanelOpen(true);
  if (tool === 'divider' || tool === 'door' || tool === 'doorHinge' || tool === 'doubleDoor') {
    props.activateManualToolId(toolId);
  }
}

export function toggleSketchBoxBasePanel(
  props: InteriorSketchBoxControlsSectionProps,
  isActive: boolean
): void {
  props.setSketchShelvesOpen(false);
  if (isActive && props.sketchBoxBasePanelOpen) {
    props.setSketchBoxBasePanelOpen(false);
    props.exitManual();
    return;
  }
  props.setSketchBoxPanelOpen(true);
  props.setSketchBoxCornicePanelOpen(false);
  props.setSketchBoxBasePanelOpen(true);
  syncSketchBoxBaseTool(props);
}

export function toggleSketchBoxCornicePanel(
  props: InteriorSketchBoxControlsSectionProps,
  isActive: boolean
): void {
  props.setSketchShelvesOpen(false);
  if (isActive && props.sketchBoxCornicePanelOpen) {
    props.setSketchBoxCornicePanelOpen(false);
    props.exitManual();
    return;
  }
  props.setSketchBoxPanelOpen(true);
  props.setSketchBoxBasePanelOpen(false);
  props.setSketchBoxCornicePanelOpen(true);
  props.enterSketchBoxCorniceTool(props.sketchBoxCorniceType);
}

export function selectSketchBoxBaseType(
  props: InteriorSketchBoxControlsSectionProps,
  type: SketchBoxBaseType
): void {
  props.setSketchBoxPanelOpen(true);
  props.setSketchBoxBaseType(type);
  syncSketchBoxBaseTool(props, type);
}

export function selectSketchBoxLegStyle(
  props: InteriorSketchBoxControlsSectionProps,
  style: SketchBoxLegStyle
): void {
  props.setSketchBoxPanelOpen(true);
  props.setSketchBoxBaseType('legs');
  props.setSketchBoxLegStyle(style);
  syncSketchBoxBaseTool(props, 'legs', style);
}

export function selectSketchBoxLegColor(
  props: InteriorSketchBoxControlsSectionProps,
  color: SketchBoxLegColor
): void {
  props.setSketchBoxPanelOpen(true);
  props.setSketchBoxBaseType('legs');
  props.setSketchBoxLegColor(color);
  syncSketchBoxBaseTool(props, 'legs', undefined, color);
}

export function updateSketchBoxLegHeightDraft(
  props: InteriorSketchBoxControlsSectionProps,
  raw: string
): void {
  props.setSketchBoxLegHeightDraft(raw);
  if (raw.trim() === '') return;
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < BASE_LEG_HEIGHT_MIN_CM || next > BASE_LEG_HEIGHT_MAX_CM) return;
  const normalized = normalizeBaseLegHeightCm(next);
  props.setSketchBoxBaseType('legs');
  props.setSketchBoxLegHeightCm(normalized);
  syncSketchBoxBaseTool(props, 'legs', undefined, undefined, normalized, undefined);
}

export function commitSketchBoxLegHeightDraft(props: InteriorSketchBoxControlsSectionProps): void {
  const next = normalizeBaseLegHeightCm(props.sketchBoxLegHeightDraft, props.sketchBoxLegHeightCm);
  props.setSketchBoxBaseType('legs');
  props.setSketchBoxLegHeightCm(next);
  props.setSketchBoxLegHeightDraft(String(next));
  syncSketchBoxBaseTool(props, 'legs', undefined, undefined, next, undefined);
}

export function updateSketchBoxLegWidthDraft(
  props: InteriorSketchBoxControlsSectionProps,
  raw: string
): void {
  props.setSketchBoxLegWidthDraft(raw);
  if (raw.trim() === '') return;
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < BASE_LEG_WIDTH_MIN_CM || next > BASE_LEG_WIDTH_MAX_CM) return;
  const normalized = normalizeBaseLegWidthCm(next);
  props.setSketchBoxBaseType('legs');
  props.setSketchBoxLegWidthCm(normalized);
  syncSketchBoxBaseTool(props, 'legs', undefined, undefined, undefined, normalized);
}

export function commitSketchBoxLegWidthDraft(props: InteriorSketchBoxControlsSectionProps): void {
  const next = normalizeBaseLegWidthCm(props.sketchBoxLegWidthDraft, props.sketchBoxLegWidthCm);
  props.setSketchBoxBaseType('legs');
  props.setSketchBoxLegWidthCm(next);
  props.setSketchBoxLegWidthDraft(String(next));
  syncSketchBoxBaseTool(props, 'legs', undefined, undefined, undefined, next);
}

export function selectSketchBoxCorniceType(
  props: InteriorSketchBoxControlsSectionProps,
  type: SketchBoxCorniceType
): void {
  props.setSketchBoxPanelOpen(true);
  props.setSketchBoxCorniceType(type);
  props.enterSketchBoxCorniceTool(type);
}

function syncSketchBoxTool(
  props: InteriorSketchBoxControlsSectionProps,
  heightCm: number,
  widthCm: number | '',
  depthCm: number | ''
): void {
  props.setSketchBoxPanelOpen(true);
  props.enterSketchBoxTool(heightCm, widthCm, depthCm);
}

function syncSketchBoxBaseTool(
  props: InteriorSketchBoxControlsSectionProps,
  type: SketchBoxBaseType = props.sketchBoxBaseType,
  style: SketchBoxLegStyle = props.sketchBoxLegStyle,
  color: SketchBoxLegColor = props.sketchBoxLegColor,
  heightCm: number = props.sketchBoxLegHeightCm,
  widthCm: number = props.sketchBoxLegWidthCm
): void {
  props.enterSketchBoxBaseTool(type, style, color, heightCm, widthCm);
}

function applyOptionalDimensionValue(
  props: InteriorSketchBoxControlsSectionProps,
  field: OptionalDimensionField,
  next: number | ''
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
): number | '' {
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
  next: number | ''
): void {
  if (field === 'width') props.setSketchBoxWidthCm(next);
  else props.setSketchBoxDepthCm(next);
}
