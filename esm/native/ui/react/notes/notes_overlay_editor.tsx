import { memo, useCallback } from 'react';
import type { KeyboardEvent } from 'react';

import { notesOverlayReportNonFatal } from './notes_overlay_helpers_shared.js';

type NoteEditorProps = {
  index: number;
  isActive: boolean;
  baseFontPx: string;
  baseTextColor: string;
  noteHtml: string;
  registerRef: (index: number, el: HTMLDivElement | null) => void;
  onBlur: (index: number) => void;
  onMouseUp: (index: number) => void;
  onKeyUp: (index: number, e: KeyboardEvent<HTMLDivElement>) => void;
  onInput: (index: number) => void;
  onFocus: (index: number) => void;
};

export const NoteEditor = memo(
  function NoteEditor(props: NoteEditorProps) {
    const {
      index,
      isActive,
      baseFontPx,
      baseTextColor,
      noteHtml,
      registerRef,
      onBlur,
      onMouseUp,
      onKeyUp,
      onInput,
      onFocus,
    } = props;

    const setRef = useCallback(
      (el: HTMLDivElement | null) => {
        registerRef(index, el);
      },
      [registerRef, index]
    );

    return (
      <div
        className="editor"
        style={{ fontSize: baseFontPx, color: baseTextColor }}
        ref={setRef}
        contentEditable={!!isActive}
        suppressContentEditableWarning={true}
        onBlur={() => onBlur(index)}
        onMouseDown={(e: import('react').MouseEvent<HTMLDivElement>) => {
          try {
            e.stopPropagation();
          } catch (__wpErr) {
            notesOverlayReportNonFatal('L320', __wpErr);
          }
        }}
        onMouseUp={() => onMouseUp(index)}
        onKeyUp={(e: import('react').KeyboardEvent<HTMLDivElement>) => onKeyUp(index, e)}
        onInput={() => onInput(index)}
        onFocus={() => onFocus(index)}
        dangerouslySetInnerHTML={{ __html: noteHtml }}
      />
    );
  },
  (a, b) =>
    a.index === b.index &&
    a.isActive === b.isActive &&
    a.baseFontPx === b.baseFontPx &&
    a.baseTextColor === b.baseTextColor &&
    a.noteHtml === b.noteHtml
);
