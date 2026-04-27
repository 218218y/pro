import type { PointerEvent, ReactElement } from 'react';

import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';

export function NoteCardPreview(props: {
  index: number;
  isActive: boolean;
  hasText: boolean;
  noteHtml: string;
  baseFontPx: string;
  baseTextColor: string;
  openNoteForEdit: (index: number) => void;
}): ReactElement | null {
  const { index, isActive, hasText, noteHtml, baseFontPx, baseTextColor, openNoteForEdit } = props;
  if (isActive || !hasText) return null;
  return (
    <div className="note-hit-pad" aria-hidden="true">
      <div
        className="note-hit"
        style={{ fontSize: baseFontPx, color: baseTextColor }}
        role="button"
        tabIndex={0}
        onPointerDown={(e: import('react').PointerEvent<HTMLDivElement>) => {
          try {
            e.stopPropagation();
          } catch (__wpErr) {
            notesOverlayReportNonFatal('L2012', __wpErr);
          }
        }}
        onClick={(e: import('react').MouseEvent<HTMLDivElement>) => {
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch (__wpErr) {
            notesOverlayReportNonFatal('L2020', __wpErr);
          }
          openNoteForEdit(index);
        }}
        onKeyDown={(e: import('react').KeyboardEvent<HTMLDivElement>) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch (__wpErr) {
            notesOverlayReportNonFatal('L2030', __wpErr);
          }
          openNoteForEdit(index);
        }}
        dangerouslySetInnerHTML={{ __html: noteHtml }}
      />
    </div>
  );
}

export function NoteCardResizeHandles(props: {
  editMode: boolean;
  index: number;
  onHandlePointerDown: (index: number, dir: string, e: PointerEvent<HTMLDivElement>) => void;
}): ReactElement | null {
  const { editMode, index, onHandlePointerDown } = props;
  if (!editMode) return null;
  return (
    <>
      {['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].map(dir => (
        <div
          key={`h-${dir}`}
          className={`resize-handle handle-${dir}`}
          onPointerDown={(e: import('react').PointerEvent<HTMLDivElement>) =>
            onHandlePointerDown(index, dir, e)
          }
        />
      ))}
    </>
  );
}
