import type { ReactElement } from 'react';

import { NoteCardToolbarBoldButton } from './notes_overlay_note_card_toolbar_bold.js';
import { NoteCardToolbarColorControl } from './notes_overlay_note_card_toolbar_color.js';
import { NoteCardToolbarDeleteButton } from './notes_overlay_note_card_toolbar_delete.js';
import { stopToolbarBubble } from './notes_overlay_note_card_toolbar_events.js';
import type { NoteCardToolbarProps } from './notes_overlay_note_card_toolbar_shared.js';
import { NoteCardToolbarSizeControl } from './notes_overlay_note_card_toolbar_size.js';

export function NoteCardToolbar(props: NoteCardToolbarProps): ReactElement {
  return (
    <div
      className="floating-toolbar"
      data-notes-ui="1"
      onPointerDown={(e: import('react').PointerEvent<HTMLDivElement>) =>
        stopToolbarBubble(e, 'J:TOOLBAR:pointerDown')
      }
      onMouseDown={(e: import('react').MouseEvent<HTMLDivElement>) =>
        stopToolbarBubble(e, 'J:TOOLBAR:mouseDown')
      }
      onClick={(e: import('react').MouseEvent<HTMLDivElement>) => stopToolbarBubble(e, 'J:TOOLBAR:click')}
    >
      <NoteCardToolbarBoldButton {...props} />
      <NoteCardToolbarColorControl {...props} />
      <NoteCardToolbarSizeControl {...props} />
      <NoteCardToolbarDeleteButton index={props.index} requestDeleteNote={props.requestDeleteNote} />
    </div>
  );
}
