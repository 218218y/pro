import type { ReactElement } from 'react';

import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';
import { resolveNotesLegacyFontSizeFromUi } from './notes_overlay_text_style_runtime.js';
import { stopToolbarBubble, stopToolbarPointer } from './notes_overlay_note_card_toolbar_events.js';
import { NOTE_TOOLBAR_SIZES, type NoteCardToolbarProps } from './notes_overlay_note_card_toolbar_shared.js';

export function NoteCardToolbarSizeControl(
  props: Pick<
    NoteCardToolbarProps,
    | 'index'
    | 'isActive'
    | 'toolbarBoldOn'
    | 'toolbarColor'
    | 'toolbarFontSize'
    | 'sizePaletteOpen'
    | 'sizePaletteUp'
    | 'sizePaletteRefs'
    | 'saveSelectionForIndex'
    | 'captureDraftOnly'
    | 'ensureSelectionForIndex'
    | 'focusEditor'
    | 'execCommand'
    | 'setColorPaletteOpen'
    | 'setSizePaletteOpen'
    | 'setToolbarFontSize'
    | 'reapplyTypingDefaults'
    | 'updateNoteStyleDefaults'
  >
): ReactElement {
  const {
    index: i,
    isActive,
    toolbarBoldOn,
    toolbarColor,
    toolbarFontSize,
    sizePaletteOpen,
    sizePaletteUp,
    sizePaletteRefs,
    saveSelectionForIndex,
    captureDraftOnly,
    ensureSelectionForIndex,
    focusEditor,
    execCommand,
    setColorPaletteOpen,
    setSizePaletteOpen,
    setToolbarFontSize,
    reapplyTypingDefaults,
    updateNoteStyleDefaults,
  } = props;

  return (
    <div className="toolbar-size-container" data-notes-ui="1">
      <button
        className="toolbar-btn toolbar-btn--square toolbar-size-btn"
        type="button"
        onMouseDown={(e: import('react').MouseEvent<HTMLButtonElement>) => {
          try {
            saveSelectionForIndex(i);
            captureDraftOnly(i);
          } catch (__wpErr) {
            notesOverlayReportNonFatal('J:SIZE:mouseDown:pre', __wpErr);
          }
          stopToolbarPointer(e, 'J:SIZE:mouseDown');
          setColorPaletteOpen(false);
          setSizePaletteOpen(v => !v);
        }}
      >
        {toolbarFontSize}
      </button>

      <div
        data-notes-ui="1"
        ref={(el: HTMLDivElement | null) => {
          sizePaletteRefs.current[i] = el;
        }}
        className={
          isActive && sizePaletteOpen ? `size-palette show${sizePaletteUp ? ' is-up' : ''}` : 'size-palette'
        }
        onPointerDown={(e: import('react').PointerEvent<HTMLDivElement>) =>
          stopToolbarBubble(e, 'J:SIZE:palette:pointerDown')
        }
        onMouseDown={(e: import('react').MouseEvent<HTMLDivElement>) =>
          stopToolbarBubble(e, 'J:SIZE:palette:mouseDown')
        }
        onClick={(e: import('react').MouseEvent<HTMLDivElement>) =>
          stopToolbarBubble(e, 'J:SIZE:palette:click')
        }
      >
        {NOTE_TOOLBAR_SIZES.map(vUi => {
          const isSel = vUi === toolbarFontSize;
          const vLegacy = resolveNotesLegacyFontSizeFromUi(vUi);
          return (
            <button
              key={vUi}
              type="button"
              className={isSel ? 'size-swatch is-selected' : 'size-swatch'}
              onClick={(e: import('react').MouseEvent<HTMLButtonElement>) =>
                stopToolbarPointer(e, 'J:SIZE:swatch:click')
              }
              onMouseDown={(e: import('react').MouseEvent<HTMLButtonElement>) => {
                try {
                  saveSelectionForIndex(i);
                } catch (__wpErr) {
                  notesOverlayReportNonFatal('J:SIZE:swatch:saveSelection', __wpErr);
                }
                stopToolbarPointer(e, 'J:SIZE:swatch:mouseDown');
                setColorPaletteOpen(false);
                ensureSelectionForIndex(i);
                focusEditor(i);
                execCommand('fontSize', vLegacy);
                setToolbarFontSize(vUi);
                setSizePaletteOpen(false);
                updateNoteStyleDefaults(i, { fontSize: vLegacy }, 'react:notes:fontSize');
                reapplyTypingDefaults(i, { color: toolbarColor, fontSize: vUi, bold: toolbarBoldOn });
              }}
            >
              {vUi}
            </button>
          );
        })}
      </div>
    </div>
  );
}
