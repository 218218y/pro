import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, readSource } from './_source_bundle.js';

const main = readSource('../esm/native/ui/react/notes/notes_overlay_controller_pointer.ts', import.meta.url);
const shared = readSource(
  '../esm/native/ui/react/notes/notes_overlay_controller_pointer_shared.ts',
  import.meta.url
);
const create = readSource(
  '../esm/native/ui/react/notes/notes_overlay_controller_pointer_create.ts',
  import.meta.url
);
const edit = readSource(
  '../esm/native/ui/react/notes/notes_overlay_controller_pointer_edit.ts',
  import.meta.url
);

test('notes overlay pointer workflows keep create/edit/shared ownership split', () => {
  assertMatchesAll(assert, main, [
    /notes_overlay_controller_pointer_create\.js/,
    /notes_overlay_controller_pointer_edit\.js/,
    /notes_overlay_controller_pointer_shared\.js/,
    /export function useNotesOverlayPointerWorkflows\(/,
  ]);
  assertLacksAll(assert, main, [
    /function preventPointerEvent\(/,
    /function trySetPointerCapture\(/,
    /const finishCreate = useCallback\(/,
    /const endInteraction = useCallback\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type NotesOverlayPointerWorkflowArgs = \{/,
    /export function readNotesOverlayInteractionRefs\(/,
    /export function preventNotesPointerEvent\(/,
    /export function trySetNotesPointerCapture\(/,
    /export function tryReleaseNotesPointerCapture\(/,
  ]);
  assertLacksAll(assert, shared, [/beginCreatePointerInteraction\(/, /beginNotePointerInteraction\(/]);

  assertMatchesAll(assert, create, [
    /export function useNotesOverlayCreatePointerWorkflow\(/,
    /finalizeCreatePointerInteraction/,
    /beginCreatePointerInteraction/,
    /readCreatePreviewRect/,
  ]);
  assertLacksAll(assert, create, [
    /beginNotePointerInteraction\(/,
    /beginHandlePointerInteraction\(/,
    /finalizePointerInteractionDraft\(/,
  ]);

  assertMatchesAll(assert, edit, [
    /export function useNotesOverlayEditPointerWorkflow\(/,
    /beginNotePointerInteraction/,
    /beginHandlePointerInteraction/,
    /finalizePointerInteractionDraft/,
    /updatePointerInteractionDraft/,
  ]);
  assertLacksAll(assert, edit, [
    /beginCreatePointerInteraction\(/,
    /finalizeCreatePointerInteraction\(/,
    /readCreatePreviewRect\(/,
  ]);
});
