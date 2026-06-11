import { memo, useCallback, useLayoutEffect, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import { OrderPdfSketchNoteToolbar } from './order_pdf_overlay_sketch_note_toolbar.js';
import { ORDER_PDF_SKETCH_TEXT_BOX_HANDLE_DIRECTIONS } from './order_pdf_overlay_sketch_text_box_runtime.js';
import {
  handleOrderPdfSketchEditorKeyDown,
  readOrderPdfSketchEditorTextValue,
  resolveOrderPdfSketchTextBoxEditorStyle,
  resolveOrderPdfSketchTextBoxStyle,
} from './order_pdf_overlay_sketch_note_box_runtime.js';

export type OrderPdfSketchNoteBoxProps = {
  textBox: OrderPdfSketchTextBox;
  active: boolean;
  textMode: boolean;
  stageWidth: number;
  registerEditorRef: (id: string, element: HTMLDivElement | null) => void;
  onActivate: (id: string) => void;
  onCommit: (id: string) => void;
  onBoxPointerDown: (textBox: OrderPdfSketchTextBox, event: ReactPointerEvent<HTMLDivElement>) => void;
  onHandlePointerDown: (
    textBox: OrderPdfSketchTextBox,
    dir: string,
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
  colorPaletteOpen: boolean;
  sizePaletteOpen: boolean;
  onToggleBold: () => void;
  onToggleColorPalette: () => void;
  onToggleSizePalette: () => void;
  onSelectColor: (color: string) => void;
  onSelectFontSize: (fontSize: number) => void;
  onDelete: () => void;
};

export const OrderPdfSketchNoteBox = memo(function OrderPdfSketchNoteBox(
  props: OrderPdfSketchNoteBoxProps
): ReactElement {
  const {
    textBox,
    active,
    textMode,
    stageWidth,
    registerEditorRef,
    onActivate,
    onCommit,
    onBoxPointerDown,
    onHandlePointerDown,
    colorPaletteOpen,
    sizePaletteOpen,
    onToggleBold,
    onToggleColorPalette,
    onToggleSizePalette,
    onSelectColor,
    onSelectFontSize,
    onDelete,
  } = props;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editable = active && textMode;

  const setEditorRef = useCallback(
    (element: HTMLDivElement | null) => {
      editorRef.current = element;
      registerEditorRef(textBox.id, element);
    },
    [registerEditorRef, textBox.id]
  );

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const activeEl = editor.ownerDocument?.activeElement ?? null;
    if (editable && activeEl === editor) return;
    const next = textBox.text;
    const current = readOrderPdfSketchEditorTextValue(editor, '');
    if (current === next) return;
    editor.textContent = next;
  }, [editable, textBox.text]);

  return (
    <div
      className={editable ? 'annotation-box active-edit' : 'annotation-box'}
      style={resolveOrderPdfSketchTextBoxStyle(textBox)}
      onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => onBoxPointerDown(textBox, event)}
    >
      <div
        className="editor"
        ref={setEditorRef}
        contentEditable={editable}
        suppressContentEditableWarning
        dir="rtl"
        style={resolveOrderPdfSketchTextBoxEditorStyle(textBox, stageWidth)}
        onBlur={() => onCommit(textBox.id)}
        onFocus={() => onActivate(textBox.id)}
        onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
          try {
            event.stopPropagation();
          } catch {
            // ignore
          }
        }}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) =>
          handleOrderPdfSketchEditorKeyDown(event, () => onCommit(textBox.id))
        }
      >
        {textBox.text}
      </div>

      {!editable ? (
        <div className="note-hit-pad" aria-hidden="true">
          <div
            className="note-hit"
            style={resolveOrderPdfSketchTextBoxEditorStyle(textBox, stageWidth)}
            role="button"
            tabIndex={0}
            onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
              try {
                event.stopPropagation();
              } catch {
                // ignore
              }
            }}
            onClick={(event: ReactMouseEvent<HTMLDivElement>) => {
              try {
                event.preventDefault();
                event.stopPropagation();
              } catch {
                // ignore
              }
              onActivate(textBox.id);
            }}
            onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              try {
                event.preventDefault();
                event.stopPropagation();
              } catch {
                // ignore
              }
              onActivate(textBox.id);
            }}
          >
            {textBox.text || '\u00a0'}
          </div>
        </div>
      ) : null}

      {editable ? (
        <OrderPdfSketchNoteToolbar
          activeColor={textBox.color}
          activeBold={!!textBox.bold}
          activeFontSize={textBox.fontSize}
          colorPaletteOpen={colorPaletteOpen}
          sizePaletteOpen={sizePaletteOpen}
          onToggleBold={onToggleBold}
          onToggleColorPalette={onToggleColorPalette}
          onToggleSizePalette={onToggleSizePalette}
          onSelectColor={onSelectColor}
          onSelectFontSize={onSelectFontSize}
          onDelete={onDelete}
        />
      ) : null}

      {editable
        ? ORDER_PDF_SKETCH_TEXT_BOX_HANDLE_DIRECTIONS.map(dir => (
            <div
              key={`${textBox.id}:${dir}`}
              className={`resize-handle handle-${dir}`}
              onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) =>
                onHandlePointerDown(textBox, dir, event)
              }
            />
          ))
        : null}
    </div>
  );
});
