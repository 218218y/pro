import {
  SKETCH_TOOL_BOX_BASE_PREFIX,
  SKETCH_TOOL_BOX_CORNICE_PREFIX,
  SKETCH_TOOL_BOX_DIVIDER,
  SKETCH_TOOL_BOX_DOOR,
  SKETCH_TOOL_BOX_DOUBLE_DOOR,
  SKETCH_TOOL_BOX_DOOR_HINGE,
  isSketchBoxTool,
} from './interior_tab_helpers.js';
import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';

export type SketchBoxControlsViewState = Readonly<{
  isSketchBoxControlsOpen: boolean;
  isSketchBoxToolActive: boolean;
  isDividerToolActive: boolean;
  isDoorToolActive: boolean;
  isDoorHingeToolActive: boolean;
  isDoubleDoorToolActive: boolean;
  isBaseToolActive: boolean;
  isCorniceToolActive: boolean;
}>;

export function readSketchBoxControlsViewState(
  props: InteriorSketchBoxControlsSectionProps
): SketchBoxControlsViewState {
  const isSketchBoxControlsOpen = props.isSketchBoxControlsOpen;
  const isSketchBoxToolActive = props.isSketchToolActive && isSketchBoxTool(props.manualToolRaw);
  const isDividerToolActive = props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DIVIDER;
  const isDoorToolActive = props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DOOR;
  const isDoorHingeToolActive =
    props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DOOR_HINGE;
  const isDoubleDoorToolActive =
    props.isSketchToolActive && props.manualToolRaw === SKETCH_TOOL_BOX_DOUBLE_DOOR;
  const isBaseToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_BOX_BASE_PREFIX);
  const isCorniceToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_BOX_CORNICE_PREFIX);

  return {
    isSketchBoxControlsOpen,
    isSketchBoxToolActive,
    isDividerToolActive,
    isDoorToolActive,
    isDoorHingeToolActive,
    isDoubleDoorToolActive,
    isBaseToolActive,
    isCorniceToolActive,
  };
}
