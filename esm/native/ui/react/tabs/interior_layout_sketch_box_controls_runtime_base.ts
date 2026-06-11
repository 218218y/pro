import type { SketchBoxBaseType, SketchBoxLegColor, SketchBoxLegStyle } from './interior_tab_helpers.js';
import {
  BASE_LEG_HEIGHT_MAX_CM,
  BASE_LEG_HEIGHT_MIN_CM,
  BASE_LEG_WIDTH_MAX_CM,
  BASE_LEG_WIDTH_MIN_CM,
  normalizeBaseLegHeightCm,
  normalizeBaseLegWidthCm,
} from '../../../features/base_leg_support.js';
import {
  BASE_PLINTH_HEIGHT_MAX_CM,
  BASE_PLINTH_HEIGHT_MIN_CM,
  DEFAULT_BASE_PLINTH_HEIGHT_CM,
  normalizeBasePlinthHeightCm,
} from '../../../features/base_plinth_support.js';
import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';
import { syncSketchBoxBaseTool } from './interior_layout_sketch_box_controls_runtime_sync.js';

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

export function updateSketchBoxPlinthHeightDraft(
  props: InteriorSketchBoxControlsSectionProps,
  raw: string
): void {
  props.setSketchBoxPlinthHeightDraft(raw);
  if (raw.trim() === '') return;
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  if (next < BASE_PLINTH_HEIGHT_MIN_CM || next > BASE_PLINTH_HEIGHT_MAX_CM) return;
  const normalized = normalizeBasePlinthHeightCm(next);
  props.setSketchBoxBaseType('plinth');
  props.setSketchBoxPlinthHeightCm(normalized);
  syncSketchBoxBaseTool(props, 'plinth', undefined, undefined, undefined, undefined, normalized);
}

export function commitSketchBoxPlinthHeightDraft(props: InteriorSketchBoxControlsSectionProps): void {
  const next = normalizeBasePlinthHeightCm(props.sketchBoxPlinthHeightDraft, props.sketchBoxPlinthHeightCm);
  props.setSketchBoxBaseType('plinth');
  props.setSketchBoxPlinthHeightCm(next);
  props.setSketchBoxPlinthHeightDraft(String(next));
  syncSketchBoxBaseTool(props, 'plinth', undefined, undefined, undefined, undefined, next);
}

export function resetSketchBoxPlinthHeight(props: InteriorSketchBoxControlsSectionProps): void {
  props.setSketchBoxBaseType('plinth');
  props.setSketchBoxPlinthHeightCm(DEFAULT_BASE_PLINTH_HEIGHT_CM);
  props.setSketchBoxPlinthHeightDraft(String(DEFAULT_BASE_PLINTH_HEIGHT_CM));
  syncSketchBoxBaseTool(
    props,
    'plinth',
    undefined,
    undefined,
    undefined,
    undefined,
    DEFAULT_BASE_PLINTH_HEIGHT_CM
  );
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
