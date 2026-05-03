import type { SketchBoxBaseType, SketchBoxLegColor, SketchBoxLegStyle } from './interior_tab_helpers.js';
import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';
import type { SketchBoxOptionalDimensionValue } from './interior_layout_sketch_box_controls_runtime_types.js';

export function syncSketchBoxTool(
  props: InteriorSketchBoxControlsSectionProps,
  heightCm: number,
  widthCm: SketchBoxOptionalDimensionValue,
  depthCm: SketchBoxOptionalDimensionValue
): void {
  props.setSketchBoxPanelOpen(true);
  props.enterSketchBoxTool(heightCm, widthCm, depthCm);
}

export function syncSketchBoxBaseTool(
  props: InteriorSketchBoxControlsSectionProps,
  type: SketchBoxBaseType = props.sketchBoxBaseType,
  style: SketchBoxLegStyle = props.sketchBoxLegStyle,
  color: SketchBoxLegColor = props.sketchBoxLegColor,
  heightCm: number = props.sketchBoxLegHeightCm,
  widthCm: number = props.sketchBoxLegWidthCm
): void {
  props.enterSketchBoxBaseTool(type, style, color, heightCm, widthCm);
}
