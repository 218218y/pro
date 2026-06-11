import type { InteriorSketchBoxControlsSectionProps } from './interior_layout_sketch_section_types.js';
import type { SketchBoxToolId } from './interior_layout_sketch_box_controls_runtime_types.js';
import {
  syncSketchBoxBaseTool,
  syncSketchBoxTool,
} from './interior_layout_sketch_box_controls_runtime_sync.js';

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
