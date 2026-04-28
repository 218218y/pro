import { useCallback, useEffect } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import {
  NOTES_OUTSIDE_POINTER_IGNORE_SELECTOR,
  NOTES_OVERLAY_IGNORE_SELECTOR,
  isNotesUiTarget,
  type NotesOverlayEditorCore,
  type UseNotesOverlayEditorWorkflowsArgs,
} from './notes_overlay_editor_workflow_shared.js';
import { installDomEventListener } from '../effects/dom_event_cleanup.js';

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
    suppressNextClickRef,
    ignoreOutsideClickUntilRef,
    readPointerEventTarget,
    captureEditorsIntoNotes,
    commitNotes,
    setDraftNotes,
    setColorPaletteOpen,
    setSizePaletteOpen,
  } = args;
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
    (_index: number) => {
      setDraftNotes(prev => {
        const next = captureEditorsIntoNotes(prev);
        commitNotes(next, 'react:notes:textBlur');
        return next;
      });
    },
    [captureEditorsIntoNotes, commitNotes, setDraftNotes]
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
    (index: number, e: KeyboardEvent<HTMLDivElement>) => {
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
    const win = doc.defaultView;
    if (!win) return;

    const onPointerDownCapture = (ev: globalThis.PointerEvent) => {
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
