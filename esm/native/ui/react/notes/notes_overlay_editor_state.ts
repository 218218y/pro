import type { AppContainer, SavedNote, SavedNoteStyle } from '../../../../../types';
import type { NotesOverlayApp } from './notes_overlay_helpers_services.js';
import {
  getSelectionOffsetsForEditorRuntime,
  readToolbarSelectionStateRuntime,
  restoreSelectionOffsetsForEditorRuntime,
  type SelectionOffsets,
  type ToolbarSelectionState,
} from './notes_overlay_editor_selection_runtime.js';
import {
  applyStylePatchToNoteRuntime,
  captureEditorsIntoNotesRuntime,
  commitOverlayNotesRuntime,
  filterEmptyNotesRuntime,
  notesChangedRuntime,
  preserveEquivalentNoteSnapshotRuntime,
  reconcileDraftNotesWithNormalizedRuntime,
  removeNoteAtIndexRuntime,
  type NotesEditorRefs,
} from './notes_overlay_editor_notes_runtime.js';

export type { SelectionOffsets, ToolbarSelectionState, NotesEditorRefs };
export type ReadSavedNoteStyle = (note: SavedNote | null | undefined) => SavedNoteStyle;
export type ReadPointerEventTarget = (target: EventTarget | null) => HTMLElement | null;
export type SelectionOffsetsRef = { current: Array<SelectionOffsets | null> };

export function getSelectionOffsetsForEditor(
  doc: Document | null | undefined,
  editor: HTMLElement | null | undefined
): SelectionOffsets | null {
  return getSelectionOffsetsForEditorRuntime(doc, editor);
}

export function restoreSelectionOffsetsForEditor(
  doc: Document | null | undefined,
  editor: HTMLElement | null | undefined,
  offsets: SelectionOffsets | null | undefined
): void {
  restoreSelectionOffsetsForEditorRuntime(doc, editor, offsets);
}

export function readToolbarSelectionState(
  doc: Document | null | undefined,
  editor: HTMLElement | null | undefined
): ToolbarSelectionState | null {
  return readToolbarSelectionStateRuntime(doc, editor);
}

export function captureEditorsIntoNotes(
  App: NotesOverlayApp,
  editorRefs: NotesEditorRefs,
  base: SavedNote[]
): SavedNote[] {
  return captureEditorsIntoNotesRuntime(App, editorRefs, base);
}

export function commitOverlayNotes(
  App: NotesOverlayApp,
  app: AppContainer,
  next: SavedNote[],
  source: string
): void {
  commitOverlayNotesRuntime(App, app, next, source);
}

export function notesChanged(a: SavedNote[], b: SavedNote[]): boolean {
  return notesChangedRuntime(a, b);
}

export function preserveEquivalentNoteSnapshot<T extends SavedNote[]>(prev: T, next: T): T {
  return preserveEquivalentNoteSnapshotRuntime(prev, next);
}

export function reconcileDraftNotesWithNormalized(prev: SavedNote[], normalized: SavedNote[]): SavedNote[] {
  return reconcileDraftNotesWithNormalizedRuntime(prev, normalized);
}

export function removeNoteAtIndex(notes: SavedNote[], index: number): SavedNote[] {
  return removeNoteAtIndexRuntime(notes, index);
}

export function filterEmptyNotes(notes: SavedNote[]): SavedNote[] {
  return filterEmptyNotesRuntime(notes);
}

export function applyStylePatchToNote(note: SavedNote, patch: Partial<SavedNoteStyle> | null): SavedNote {
  return applyStylePatchToNoteRuntime(note, patch);
}
