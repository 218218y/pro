import type { ReactElement } from 'react';

import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';
import type { NoteCardToolbarProps } from './notes_overlay_note_card_toolbar_shared.js';
import { stopToolbarPointer } from './notes_overlay_note_card_toolbar_events.js';

export function NoteCardToolbarBoldButton(
  props: Pick<
    NoteCardToolbarProps,
    | 'index'
    | 'toolbarBoldOn'
    | 'toolbarColor'
    | 'toolbarFontSize'
    | 'saveSelectionForIndex'
    | 'captureDraftOnly'
    | 'ensureSelectionForIndex'
    | 'focusEditor'
    | 'execCommand'
    | 'setColorPaletteOpen'
    | 'setToolbarBoldOn'
    | 'persistActiveNote'
    | 'reapplyTypingDefaults'
    | 'doc'
  >
): ReactElement {
  const {
    index: i,
    toolbarBoldOn,
    toolbarColor,
    toolbarFontSize,
    saveSelectionForIndex,
    captureDraftOnly,
    ensureSelectionForIndex,
    focusEditor,
    execCommand,
    setColorPaletteOpen,
    setToolbarBoldOn,
    persistActiveNote,
    reapplyTypingDefaults,
    doc,
  } = props;

  return (
    <button
      className={
        toolbarBoldOn ? 'toolbar-btn toolbar-btn--square active-state' : 'toolbar-btn toolbar-btn--square'
      }
      type="button"
      onMouseDown={(e: import('react').MouseEvent<HTMLButtonElement>) => {
        try {
          saveSelectionForIndex(i);
          captureDraftOnly(i);
        } catch (__wpErr) {
          notesOverlayReportNonFatal('J:BOLD:mouseDown:pre', __wpErr);
        }
        stopToolbarPointer(e, 'J:BOLD:mouseDown');
      }}
      onClick={() => {
        setColorPaletteOpen(false);
        try {
          ensureSelectionForIndex(i);
        } catch (__wpErr) {
          notesOverlayReportNonFatal('J:BOLD:ensure', __wpErr);
        }
        execCommand('bold');

        let desiredBold = !toolbarBoldOn;
        try {
          if (doc) {
            const q = !!doc.queryCommandState('bold');
            desiredBold = q === toolbarBoldOn ? !toolbarBoldOn : q;
          }
        } catch (__wpErr) {
          notesOverlayReportNonFatal('J:BOLD:queryState', __wpErr);
        }
        setToolbarBoldOn(desiredBold);

        try {
          focusEditor(i);
        } catch (__wpErr) {
          notesOverlayReportNonFatal('J:BOLD:focus', __wpErr);
        }

        persistActiveNote(i, null, 'react:notes:bold');
        reapplyTypingDefaults(i, { color: toolbarColor, fontSize: toolbarFontSize, bold: desiredBold });
      }}
    >
      <b>B</b>
    </button>
  );
}
