import type { SketchBoxCorniceType } from './interior_tab_helpers.js';
import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';

export function selectSketchBoxCorniceType(
  props: InteriorSketchBoxControlsSectionProps,
  type: SketchBoxCorniceType
): void {
  props.setSketchBoxPanelOpen(true);
  props.setSketchBoxCorniceType(type);
  props.enterSketchBoxCorniceTool(type);
}
