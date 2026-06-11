import type { ReactElement } from 'react';

import { InlineNotice, ModeToggleButton } from '../components/index.js';
import {
  STRUCTURE_LIBRARY_MODE_BUTTON_TEST_ID,
  STRUCTURE_LIBRARY_SECTION_TEST_ID,
  STRUCTURE_LIBRARY_NOTICE_ACTIVE,
  STRUCTURE_LIBRARY_NOTICE_INACTIVE,
  type StructureLibrarySectionProps,
} from './structure_tab_aux_sections_contracts.js';

export function StructureLibrarySection(props: StructureLibrarySectionProps): ReactElement {
  return (
    <div className="control-section" data-testid={STRUCTURE_LIBRARY_SECTION_TEST_ID}>
      <div className="wp-field">
        <ModeToggleButton
          active={props.isLibraryMode}
          onClick={props.onToggleLibraryMode}
          className="wp-r-mode-btn"
          data-testid={STRUCTURE_LIBRARY_MODE_BUTTON_TEST_ID}
        >
          ספריות
        </ModeToggleButton>

        <InlineNotice>
          {props.isLibraryMode ? STRUCTURE_LIBRARY_NOTICE_ACTIVE : STRUCTURE_LIBRARY_NOTICE_INACTIVE}
        </InlineNotice>

        {props.isLibraryMode && !props.isChestMode ? (
          <div className="wp-field-sub" style={{ marginTop: 12 }}>
            {props.dimensionsContent}
          </div>
        ) : null}
      </div>
    </div>
  );
}
