import type { ReactElement } from 'react';

import { OptionBtn, SKETCH_TOOL_EXT_DRAWERS_PREFIX, isSketchBoxTool, cx } from './interior_tab_helpers.js';
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
  const isSketchExtDrawersControlsOpen =
    props.sketchExtDrawersPanelOpen ||
    (props.isSketchToolActive && props.manualToolRaw.startsWith(SKETCH_TOOL_EXT_DRAWERS_PREFIX));

  return (
    <>
      <OptionBtn
        className="wp-manual-toggle wp-sketch-toggle"
        selected={props.sketchRowOpen || props.isSketchToolActive}
        onClick={() => {
          if (props.sketchRowOpen || props.isSketchToolActive) {
            props.setSketchRowOpen(false);
            props.setSketchShelvesOpen(false);
            if (props.isSketchToolActive) props.exitManual();
            return;
          }
          props.setSketchRowOpen(true);
        }}
        title="מצב סקיצה – בנייה עצמאית"
      >
        <strong>✏️ חלוקה ידנית לפי סקיצה</strong>
        <i
          className={cx(
            'fas',
            props.sketchRowOpen || props.isSketchToolActive ? 'fa-chevron-up' : 'fa-chevron-down',
            'wp-chevron'
          )}
          aria-hidden="true"
        />
      </OptionBtn>

      <div className={cx('wp-sketch-row', props.sketchRowOpen || props.isSketchToolActive ? '' : 'hidden')}>
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
