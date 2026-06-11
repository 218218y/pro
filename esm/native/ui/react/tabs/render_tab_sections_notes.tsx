import type { ReactElement } from 'react';

import { ModeToggleButton, ToggleRow } from '../components/index.js';
import type { RenderTabNotesModel } from './use_render_tab_notes.js';

export function RenderNotesSection(props: { model: RenderTabNotesModel }): ReactElement {
  const model = props.model;

  return (
    <div className="control-section">
      <ToggleRow
        label={
          <>
            <i className="fas fa-comment-dots"></i> הצג הערות
          </>
        }
        checked={model.notesEnabled}
        onChange={model.toggleNotes}
        testId="toggle-notes"
      />

      {model.notesEnabled ? (
        <div className="wp-r-notes-action-container">
          <ModeToggleButton
            active={model.notesDrawMode}
            className="wp-r-notes-action-btn"
            icon={<i className="fas fa-vector-square"></i>}
            onClick={model.toggleNotesDrawMode}
          >
            {model.notesDrawMode ? 'סיום עריכה' : 'סמן אזור וכתוב'}
          </ModeToggleButton>
        </div>
      ) : null}
    </div>
  );
}
