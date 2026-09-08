import { useCallback, useEffect, useRef } from 'react';
import type { FocusEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';

import {
  NOTES_OUTSIDE_POINTER_IGNORE_SELECTOR,
  NOTES_OVERLAY_IGNORE_SELECTOR,
  isNotesUiTarget,
  type NotesOverlayEditorCore,
  type UseNotesOverlayEditorWorkflowsArgs,
} from './notes_overlay_editor_workflow_shared.js';
import { installDomEventListener } from '../effects/dom_event_cleanup.js';
import { getSelectionOffsetsForEditor } from './notes_overlay_editor_state.js';
import {
  cloneNoteForClipboard,
  createDuplicatedNote,
  readNotesClipboardShortcut,
} from './notes_overlay_controller_interactions_shared.js';
import type { SavedNote } from '../../../../../types';

export type NotesOverlayEditorEventHandlers = Pick<
  import('./notes_overlay_editor_workflow_shared.js').NotesOverlayEditorWorkflows,
  'onOverlayClick' | 'onEditorBlur' | 'onEditorMouseUp' | 'onEditorKeyUp' | 'onEditorInput' | 'onEditorFocus'
>;

export function useNotesOverlayEditorWorkflowEvents(
  args: UseNotesOverlayEditorWorkflowsArgs,
  core: NotesOverlayEditorCore
): NotesOverlayEditorEventHandlers {
  const {
    doc,
    notesEnabled,
    editMode,
    activeIndex,
    interaction,
    editorRefs,
    draftNotes,
    draftNotesRef,
    setDraftNotes,
    captureEditorsIntoNotes,
    commitNotes,
    suppressNextClickRef,
    ignoreOutsideClickUntilRef,
    readPointerEventTarget,
    setColorPaletteOpen,
    setSizePaletteOpen,
  } = args;
  const copiedNoteRef = useRef<SavedNote | null>(null);

  const {
    captureAndCommitDraft,
    captureActiveDraftIfDirty,
    saveSelectionForIndex,
    scheduleTypingPersist,
    setActive,
    syncToolbarFromSelection,
  } = core;

  const onOverlayClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!editMode || !notesEnabled) return;
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      if (Date.now() < ignoreOutsideClickUntilRef.current) return;
      const target = readPointerEventTarget(e.target);
      if (isNotesUiTarget(target, NOTES_OVERLAY_IGNORE_SELECTOR)) return;
      captureAndCommitDraft('react:notes:outsideClick');
      setActive(null);
      setColorPaletteOpen(false);
      setSizePaletteOpen(false);
    },
    [
      editMode,
      notesEnabled,
      suppressNextClickRef,
      ignoreOutsideClickUntilRef,
      readPointerEventTarget,
      captureAndCommitDraft,
      setActive,
      setColorPaletteOpen,
      setSizePaletteOpen,
    ]
  );

  const onEditorBlur = useCallback(
    (_index: number, e?: FocusEvent<HTMLDivElement>) => {
      const relatedTarget = readPointerEventTarget(e?.relatedTarget || null);
      if (isNotesUiTarget(relatedTarget, NOTES_OUTSIDE_POINTER_IGNORE_SELECTOR)) return;
      captureAndCommitDraft('react:notes:textBlur');
    },
    [captureAndCommitDraft, readPointerEventTarget]
  );

  const onEditorMouseUp = useCallback(
    (index: number) => {
      captureActiveDraftIfDirty(index);
      saveSelectionForIndex(index);
      syncToolbarFromSelection(index);
    },
    [captureActiveDraftIfDirty, saveSelectionForIndex, syncToolbarFromSelection]
  );

  const onEditorKeyUp = useCallback(
    (index: number, e: ReactKeyboardEvent<HTMLDivElement>) => {
      const key = String(e.key || '');
      const isNavigationKey =
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'Home' ||
        key === 'End' ||
        key === 'PageUp' ||
        key === 'PageDown';

      const accel =
        !!(e.ctrlKey || e.metaKey) ||
        (typeof e.getModifierState === 'function' &&
          (e.getModifierState('Control') || e.getModifierState('Meta')));

      const isSelectAll =
        accel && (String(e.code || '') === 'KeyA' || key.toLowerCase() === 'a' || e.keyCode === 65);
      const isSelectionNav = isNavigationKey && (e.shiftKey || e.ctrlKey || e.metaKey);

      if (isSelectAll || isSelectionNav) captureActiveDraftIfDirty(index);

      saveSelectionForIndex(index);
      syncToolbarFromSelection(index);
    },
    [captureActiveDraftIfDirty, saveSelectionForIndex, syncToolbarFromSelection]
  );

  const onEditorInput = useCallback(
    (index: number) => {
      saveSelectionForIndex(index);
      syncToolbarFromSelection(index);
      scheduleTypingPersist('react:notes:typing');
    },
    [saveSelectionForIndex, syncToolbarFromSelection, scheduleTypingPersist]
  );

  const onEditorFocus = useCallback(
    (index: number) => {
      saveSelectionForIndex(index);
      syncToolbarFromSelection(index);
    },
    [saveSelectionForIndex, syncToolbarFromSelection]
  );

  useEffect(() => {
    if (!doc) return;

    const onKeyDownCapture = (ev: Event) => {
      const KeyboardEventCtor = doc.defaultView?.KeyboardEvent;
      if (!KeyboardEventCtor || !(ev instanceof KeyboardEventCtor) || ev.defaultPrevented) return;
      if (!editMode || !notesEnabled || activeIndex == null || interaction) return;

      const shortcut = readNotesClipboardShortcut(ev);
      if (!shortcut) return;

      const activeEditor = editorRefs.current[activeIndex];
      if (getSelectionOffsetsForEditor(doc, activeEditor)) return;

      const base = draftNotesRef.current || draftNotes;
      const captured = captureEditorsIntoNotes(base);
      const activeNote = captured[activeIndex];
      if (!activeNote) return;

      if (shortcut === 'copy') {
        copiedNoteRef.current = cloneNoteForClipboard(activeNote);
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }

      const copied = copiedNoteRef.current;
      if (!copied) return;

      const duplicate = createDuplicatedNote(copied);
      const next = [...captured, duplicate];
      const nextIndex = next.length - 1;

      ev.preventDefault();
      ev.stopPropagation();
      draftNotesRef.current = next;
      setDraftNotes(next);
      commitNotes(next, 'react:notes:duplicate');
      setActive(nextIndex);
    };

    return installDomEventListener({
      target: doc,
      type: 'keydown',
      listener: onKeyDownCapture as EventListener,
      options: true,
      label: 'notesOverlayClipboardShortcut',
    });
  }, [
    activeIndex,
    captureEditorsIntoNotes,
    commitNotes,
    doc,
    draftNotes,
    draftNotesRef,
    editMode,
    editorRefs,
    interaction,
    notesEnabled,
    setActive,
    setDraftNotes,
  ]);

  useEffect(() => {
    if (!doc) return;
    const win = doc.defaultView;
    if (!win) return;

    const onPointerDownCapture = (ev: PointerEvent) => {
      if (!editMode || !notesEnabled) return;
      if (activeIndex == null) return;

      const target = ev.target;
      const targetNode = target instanceof Node ? target : null;
      const targetEl = target instanceof HTMLElement ? target : null;

      const activeEditor = editorRefs.current[activeIndex];
      if (activeEditor && targetNode && activeEditor.contains(targetNode)) return;
      if (interaction) return;
      if (isNotesUiTarget(targetEl, NOTES_OUTSIDE_POINTER_IGNORE_SELECTOR)) return;

      captureAndCommitDraft('react:notes:outsidePointerDown');
    };

    return installDomEventListener({
      target: win,
      type: 'pointerdown',
      listener: onPointerDownCapture as EventListener,
      options: true,
      label: 'notesOverlayOutsidePointerDown',
    });
  }, [doc, editMode, notesEnabled, activeIndex, interaction, editorRefs, captureAndCommitDraft]);

  return {
    onOverlayClick,
    onEditorBlur,
    onEditorMouseUp,
    onEditorKeyUp,
    onEditorInput,
    onEditorFocus,
  };
}
