import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactElement } from 'react';

import {
  resolveNotesFontSizePxFromUi,
  resolveNotesToolbarFontSizeUiFromPx,
} from '../notes/notes_overlay_text_style_runtime.js';
import { NOTE_TOOLBAR_COLORS, NOTE_TOOLBAR_SIZES } from '../notes/notes_overlay_note_card_toolbar_shared.js';

function stopToolbarMouse(event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>) {
  try {
    event.preventDefault();
    event.stopPropagation();
  } catch {
    // ignore
  }
}

function resolveToolbarFontSizeUi(fontSize: number): string {
  return resolveNotesToolbarFontSizeUiFromPx(Math.max(12, Math.round(fontSize || 18)));
}

function resolveToolbarFontSizePx(uiSize: string): number {
  return resolveNotesFontSizePxFromUi(uiSize);
}

export type OrderPdfSketchNoteToolbarProps = {
  activeColor: string;
  activeBold: boolean;
  activeFontSize: number;
  colorPaletteOpen: boolean;
  sizePaletteOpen: boolean;
  onToggleBold: () => void;
  onToggleColorPalette: () => void;
  onToggleSizePalette: () => void;
  onSelectColor: (color: string) => void;
  onSelectFontSize: (fontSize: number) => void;
  onDelete: () => void;
};

export function OrderPdfSketchNoteToolbar(props: OrderPdfSketchNoteToolbarProps): ReactElement {
  const {
    activeColor,
    activeBold,
    activeFontSize,
    colorPaletteOpen,
    sizePaletteOpen,
    onToggleBold,
    onToggleColorPalette,
    onToggleSizePalette,
    onSelectColor,
    onSelectFontSize,
    onDelete,
  } = props;
  const fontSizeUi = resolveToolbarFontSizeUi(activeFontSize);

  return (
    <div
      className="floating-toolbar"
      onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => stopToolbarMouse(event)}
      onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => stopToolbarMouse(event)}
      onClick={(event: ReactMouseEvent<HTMLDivElement>) => stopToolbarMouse(event)}
    >
      <button
        type="button"
        className={
          activeBold ? 'toolbar-btn toolbar-btn--square active-state' : 'toolbar-btn toolbar-btn--square'
        }
        aria-pressed={activeBold}
        title="מודגש"
        onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>) => stopToolbarMouse(event)}
        onClick={onToggleBold}
      >
        <b>B</b>
      </button>

      <div className="toolbar-color-container">
        <button
          type="button"
          className="toolbar-btn toolbar-btn--square toolbar-color-btn"
          title="צבע טקסט"
          style={{
            backgroundColor: activeColor,
            borderColor: activeColor,
            borderWidth: '2px',
            boxShadow:
              String(activeColor || '').toLowerCase() === '#ffffff' ? 'inset 0 0 0 1px #cbd5e1' : undefined,
          }}
          onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>) => stopToolbarMouse(event)}
          onClick={onToggleColorPalette}
        />

        <div
          className={colorPaletteOpen ? 'color-palette show is-horizontal' : 'color-palette is-horizontal'}
          onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => stopToolbarMouse(event)}
          onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => stopToolbarMouse(event)}
          onClick={(event: ReactMouseEvent<HTMLDivElement>) => stopToolbarMouse(event)}
        >
          {NOTE_TOOLBAR_COLORS.map(color => (
            <div
              key={color}
              className="color-swatch"
              title={color}
              style={{ backgroundColor: color }}
              onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => stopToolbarMouse(event)}
              onClick={() => onSelectColor(color)}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-size-container">
        <button
          type="button"
          className="toolbar-btn toolbar-btn--square toolbar-size-btn"
          title="גודל טקסט"
          onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>) => stopToolbarMouse(event)}
          onClick={onToggleSizePalette}
        >
          {fontSizeUi}
        </button>

        <div
          className={sizePaletteOpen ? 'size-palette show is-horizontal' : 'size-palette is-horizontal'}
          onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => stopToolbarMouse(event)}
          onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => stopToolbarMouse(event)}
          onClick={(event: ReactMouseEvent<HTMLDivElement>) => stopToolbarMouse(event)}
        >
          {NOTE_TOOLBAR_SIZES.map(size => (
            <button
              key={size}
              type="button"
              className={size === fontSizeUi ? 'size-swatch is-selected' : 'size-swatch'}
              onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>) => stopToolbarMouse(event)}
              onClick={() => onSelectFontSize(resolveToolbarFontSizePx(size))}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="toolbar-btn toolbar-btn--square close-btn"
        title="מחק תיבת טקסט"
        onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>) => stopToolbarMouse(event)}
        onClick={onDelete}
      >
        <i className="fas fa-trash" />
      </button>
    </div>
  );
}
