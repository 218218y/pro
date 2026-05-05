import type { ReactElement } from 'react';

import { NoteEditor } from './notes_overlay_helpers.js';
import { NoteCardPreview, NoteCardResizeHandles } from './notes_overlay_note_card_preview.js';
import { readNoteCardDerived, type NoteCardProps } from './notes_overlay_note_card_shared.js';
import { NoteCardToolbar } from './notes_overlay_note_card_toolbar.js';

export function NoteCard(props: NoteCardProps): ReactElement {
  const {
    index: i,
    note,
    editMode,
    registerEditorRef,
    onBoxPointerDown,
    onEditorBlur,
    onEditorMouseUp,
    onEditorKeyUp,
    onEditorInput,
    onEditorFocus,
    onHandlePointerDown,
  } = props;

  const { style, isActive, noteHtml, hasText, baseFontPx, baseTextColor } = readNoteCardDerived({
    note,
    editMode,
    activeIndex: props.activeIndex,
    index: i,
    doc: props.doc,
  });

  return (
    <div
      className={isActive ? 'annotation-box active-edit' : 'annotation-box'}
      data-doors-open={typeof note.doorsOpen === 'boolean' ? String(!!note.doorsOpen) : undefined}
      style={{
        left: typeof style.left === 'string' && style.left ? style.left : '0px',
        top: typeof style.top === 'string' && style.top ? style.top : '0px',
        width: typeof style.width === 'string' && style.width ? style.width : '150px',
        height: typeof style.height === 'string' && style.height ? style.height : '100px',
      }}
      onPointerDown={(e: import('react').PointerEvent<HTMLDivElement>) => onBoxPointerDown(i, e)}
    >
      <NoteEditor
        index={i}
        isActive={!!isActive}
        baseFontPx={baseFontPx}
        baseTextColor={baseTextColor}
        noteHtml={noteHtml}
        registerRef={registerEditorRef}
        onBlur={onEditorBlur}
        onMouseUp={onEditorMouseUp}
        onKeyUp={onEditorKeyUp}
        onInput={onEditorInput}
        onFocus={onEditorFocus}
      />

      <NoteCardPreview
        index={i}
        isActive={isActive}
        hasText={hasText}
        noteHtml={noteHtml}
        baseFontPx={baseFontPx}
        baseTextColor={baseTextColor}
        openNoteForEdit={props.openNoteForEdit}
      />

      <NoteCardToolbar
        index={i}
        isActive={isActive}
        toolbarBoldOn={props.toolbarBoldOn}
        toolbarColor={props.toolbarColor}
        toolbarFontSize={props.toolbarFontSize}
        colorPaletteOpen={props.colorPaletteOpen}
        sizePaletteOpen={props.sizePaletteOpen}
        colorPaletteUp={props.colorPaletteUp}
        sizePaletteUp={props.sizePaletteUp}
        colorPaletteRefs={props.colorPaletteRefs}
        sizePaletteRefs={props.sizePaletteRefs}
        saveSelectionForIndex={props.saveSelectionForIndex}
        captureDraftOnly={props.captureDraftOnly}
        ensureSelectionForIndex={props.ensureSelectionForIndex}
        focusEditor={props.focusEditor}
        execCommand={props.execCommand}
        setColorPaletteOpen={props.setColorPaletteOpen}
        setSizePaletteOpen={props.setSizePaletteOpen}
        setToolbarBoldOn={props.setToolbarBoldOn}
        setToolbarColor={props.setToolbarColor}
        setToolbarFontSize={props.setToolbarFontSize}
        persistActiveNote={props.persistActiveNote}
        reapplyTypingDefaults={props.reapplyTypingDefaults}
        updateNoteStyleDefaults={props.updateNoteStyleDefaults}
        requestDeleteNote={props.requestDeleteNote}
        doc={props.doc}
      />

      <NoteCardResizeHandles editMode={editMode} index={i} onHandlePointerDown={onHandlePointerDown} />
    </div>
  );
}
