import type { ReactElement } from 'react';

import { SKETCH_TOOL_EXT_DRAWERS_PREFIX, isSketchBoxPanelTool } from './interior_tab_helpers.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';
import {
  InteriorDoorTrimSection,
  InteriorSketchBoxControlsSection,
  InteriorSketchDrawersSection,
  InteriorSketchShelvesSection,
} from './interior_layout_sketch_sections.js';

export function InteriorLayoutSketchToolsPanel(props: InteriorLayoutSectionProps): ReactElement {
  const isSketchBoxPanelToolActive = props.isSketchToolActive && isSketchBoxPanelTool(props.manualToolRaw);
  const isSketchBoxControlsOpen = props.sketchBoxPanelOpen || isSketchBoxPanelToolActive;
  const isDoorTrimControlsOpen = props.doorTrimPanelOpen || props.isDoorTrimMode;
  const isSketchExtDrawersToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX);
  const isSketchExtDrawersControlsOpen = props.sketchExtDrawersPanelOpen || isSketchExtDrawersToolActive;

  if (props.isChestMode) {
    return <InteriorDoorTrimSection {...props} isDoorTrimControlsOpen={isDoorTrimControlsOpen} />;
  }

  return (
    <>
      <InteriorSketchShelvesSection {...props} />
      <InteriorSketchBoxControlsSection {...props} isSketchBoxControlsOpen={isSketchBoxControlsOpen} />
      <InteriorDoorTrimSection {...props} isDoorTrimControlsOpen={isDoorTrimControlsOpen} />
      <InteriorSketchDrawersSection
        {...props}
        isSketchExtDrawersControlsOpen={isSketchExtDrawersControlsOpen}
      />
    </>
  );
}
