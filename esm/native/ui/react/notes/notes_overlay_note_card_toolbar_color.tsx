import type { ReactElement } from 'react';

import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';
import { stopToolbarBubble, stopToolbarPointer } from './notes_overlay_note_card_toolbar_events.js';
import { NOTE_TOOLBAR_COLORS, type NoteCardToolbarProps } from './notes_overlay_note_card_toolbar_shared.js';

export function NoteCardToolbarColorControl(
  props: Pick<
    NoteCardToolbarProps,
    | 'index'
    | 'isActive'
    | 'toolbarBoldOn'
    | 'toolbarColor'
    | 'toolbarFontSize'
    | 'colorPaletteOpen'
    | 'colorPaletteUp'
    | 'colorPaletteRefs'
    | 'saveSelectionForIndex'
    | 'captureDraftOnly'
    | 'ensureSelectionForIndex'
    | 'focusEditor'
    | 'execCommand'
    | 'setColorPaletteOpen'
    | 'setSizePaletteOpen'
    | 'setToolbarColor'
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
    colorPaletteOpen,
    colorPaletteUp,
    colorPaletteRefs,
    saveSelectionForIndex,
    captureDraftOnly,
    ensureSelectionForIndex,
    focusEditor,
    execCommand,
    setColorPaletteOpen,
    setSizePaletteOpen,
    setToolbarColor,
    reapplyTypingDefaults,
    updateNoteStyleDefaults,
  } = props;

  return (
    <div className="toolbar-color-container">
      <button
        className="toolbar-btn toolbar-btn--square toolbar-color-btn"
        type="button"
        style={{
          backgroundColor: toolbarColor,
          borderColor: toolbarColor,
          borderWidth: '2px',
          boxShadow:
            String(toolbarColor || '').toLowerCase() === '#ffffff' ? 'inset 0 0 0 1px #cbd5e1' : undefined,
        }}
        onMouseDown={(e: import('react').MouseEvent<HTMLButtonElement>) => {
          try {
            saveSelectionForIndex(i);
            captureDraftOnly(i);
          } catch (__wpErr) {
            notesOverlayReportNonFatal('J:COLOR:mouseDown:pre', __wpErr);
          }
          stopToolbarPointer(e, 'J:COLOR:mouseDown');
          setSizePaletteOpen(false);
          setColorPaletteOpen(v => !v);
        }}
      />
      <div
        data-notes-ui="1"
        ref={(el: HTMLDivElement | null) => {
          colorPaletteRefs.current[i] = el;
        }}
        className={
          isActive && colorPaletteOpen
            ? `color-palette show${colorPaletteUp ? ' is-up' : ''}`
            : 'color-palette'
        }
        onPointerDown={(e: import('react').PointerEvent<HTMLDivElement>) =>
          stopToolbarBubble(e, 'J:COLOR:palette:pointerDown')
        }
        onMouseDown={(e: import('react').MouseEvent<HTMLDivElement>) =>
          stopToolbarBubble(e, 'J:COLOR:palette:mouseDown')
        }
        onClick={(e: import('react').MouseEvent<HTMLDivElement>) =>
          stopToolbarBubble(e, 'J:COLOR:palette:click')
        }
      >
        {NOTE_TOOLBAR_COLORS.map(hex => (
          <div
            key={hex}
            className="color-swatch"
            style={{ backgroundColor: hex }}
            onClick={(e: import('react').MouseEvent<HTMLDivElement>) =>
              stopToolbarPointer(e, 'J:COLOR:swatch:click')
            }
            onMouseDown={(e: import('react').MouseEvent<HTMLButtonElement>) => {
              try {
                saveSelectionForIndex(i);
              } catch (__wpErr) {
                notesOverlayReportNonFatal('J:COLOR:swatch:saveSelection', __wpErr);
              }
              stopToolbarPointer(e, 'J:COLOR:swatch:mouseDown');
              ensureSelectionForIndex(i);
              focusEditor(i);
              execCommand('foreColor', hex);
              setToolbarColor(hex);
              setColorPaletteOpen(false);
              updateNoteStyleDefaults(i, { textColor: hex }, 'react:notes:textColor');
              reapplyTypingDefaults(i, { color: hex, fontSize: toolbarFontSize, bold: toolbarBoldOn });
            }}
          />
        ))}
      </div>
    </div>
  );
}
