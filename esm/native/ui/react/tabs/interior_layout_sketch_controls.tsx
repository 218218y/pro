import type { ReactElement } from 'react';

import {
  OptionBtn,
  SKETCH_TOOL_EXT_DRAWERS_PREFIX,
  cx,
  isSketchBoxTool,
  isSketchInternalDrawersTool,
} from './interior_tab_helpers.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';
import {
  InteriorDoorTrimSection,
  InteriorSketchBoxControlsSection,
  InteriorSketchDrawersSection,
  InteriorSketchShelvesSection,
} from './interior_layout_sketch_sections.js';

export function InteriorLayoutSketchControls(props: InteriorLayoutSectionProps): ReactElement {
  const isSketchBoxToolActive = props.isSketchToolActive && isSketchBoxTool(props.manualToolRaw);
  const isSketchBoxControlsOpen = props.sketchBoxPanelOpen || isSketchBoxToolActive;
  const isDoorTrimControlsOpen = props.doorTrimPanelOpen || props.isDoorTrimMode;
  const isSketchExtDrawersToolActive =
    props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX);
  const isSketchIntDrawersToolActive =
    props.isSketchToolActive && isSketchInternalDrawersTool(props.manualToolRaw);
  const isEmbeddedSketchDrawersToolActive = isSketchExtDrawersToolActive || isSketchIntDrawersToolActive;
  const shouldShowSketchRow =
    props.sketchRowOpen || (props.isSketchToolActive && !isEmbeddedSketchDrawersToolActive);
  const isSketchExtDrawersControlsOpen = props.sketchExtDrawersPanelOpen || isSketchExtDrawersToolActive;

  return (
    <>
      <OptionBtn
        className="wp-manual-toggle wp-sketch-toggle"
        selected={shouldShowSketchRow || isEmbeddedSketchDrawersToolActive}
        onClick={() => {
          if (props.sketchRowOpen) {
            props.setSketchRowOpen(false);
            props.setSketchShelvesOpen(false);
            if (props.isSketchToolActive && !isEmbeddedSketchDrawersToolActive) props.exitManual();
            return;
          }
          props.setSketchRowOpen(true);
        }}
        title="מצב סקיצה – בנייה עצמאית"
      >
        <strong>✏️ חלוקה ידנית לפי סקיצה</strong>
        <i
          className={cx('fas', shouldShowSketchRow ? 'fa-chevron-up' : 'fa-chevron-down', 'wp-chevron')}
          aria-hidden="true"
        />
      </OptionBtn>

      <div className={cx('wp-sketch-row', shouldShowSketchRow ? '' : 'hidden')}>
        <InteriorSketchShelvesSection {...props} />
        <InteriorSketchBoxControlsSection {...props} isSketchBoxControlsOpen={isSketchBoxControlsOpen} />
        <InteriorDoorTrimSection {...props} isDoorTrimControlsOpen={isDoorTrimControlsOpen} />
        <InteriorSketchDrawersSection
          {...props}
          isSketchExtDrawersControlsOpen={isSketchExtDrawersControlsOpen}
        />
      </div>
    </>
  );
}
