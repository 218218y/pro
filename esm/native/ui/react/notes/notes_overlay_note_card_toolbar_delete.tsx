import type { ReactElement } from 'react';

import type { NoteCardToolbarProps } from './notes_overlay_note_card_toolbar_shared.js';
import { stopToolbarPointer } from './notes_overlay_note_card_toolbar_events.js';

export function NoteCardToolbarDeleteButton(
  props: Pick<NoteCardToolbarProps, 'index' | 'requestDeleteNote'>
): ReactElement {
  const { index, requestDeleteNote } = props;
  return (
    <button
      className="toolbar-btn toolbar-btn--square close-btn wp-r-styled-tooltip wp-pdf-ui-hint wp-pdf-ui-hint--side-right"
      type="button"
      data-tooltip="מחק הערה"
      onMouseDown={(e: import('react').MouseEvent<HTMLButtonElement>) =>
        stopToolbarPointer(e, 'J:DELETE:mouseDown')
      }
      onClick={() => requestDeleteNote(index)}
    >
      <i className="fas fa-trash-alt" />
    </button>
  );
}
