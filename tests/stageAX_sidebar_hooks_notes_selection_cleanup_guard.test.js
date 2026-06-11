import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, bundleSources, readSource } from './_source_bundle.js';

const sidebar = bundleSources(
  [
    '../esm/native/ui/react/sidebar_app.tsx',
    '../esm/native/ui/react/sidebar_header.tsx',
    '../esm/native/ui/react/sidebar_header_actions.ts',
    '../esm/native/ui/react/use_sidebar_view_state.ts',
    '../esm/native/ui/react/sidebar_shared.ts',
  ],
  import.meta.url
);
const hooks = readSource('../esm/native/ui/react/hooks.tsx', import.meta.url);
const notesSelectionState = readSource(
  '../esm/native/ui/react/notes/notes_overlay_editor_state.ts',
  import.meta.url
);
const notesSelectionRuntime = readSource(
  '../esm/native/ui/react/notes/notes_overlay_editor_selection_runtime.ts',
  import.meta.url
);
const notesOverlay = readSource('../esm/native/ui/react/notes/NotesOverlay.tsx', import.meta.url);

test('[stageAX] sidebar/hooks/notes-selection keep UI seams on typed readers instead of bag casts', () => {
  assertMatchesAll(
    assert,
    sidebar,
    [
      /function readCloudSyncService\(app: AppContainer\): CloudSyncServiceLike \| null \{/,
      /const sketch = useRuntimeSelector\(/,
      /readRuntimeScalarOrDefault\(rt, 'sketchMode', false\)/,
      /const target = readEventTargetElement\(e\.target\);/,
    ],
    'sidebar'
  );
  assertLacksAll(
    assert,
    sidebar,
    [/app as SidebarAppLike/, /as ProjectDataRecord/, /e\.target as HTMLElement/],
    'sidebar'
  );

  assertMatchesAll(
    assert,
    hooks,
    [
      /function readRecord\(value: unknown\): UnknownRecord \| null \{/,
      /return useStoreSelector\(st => selector\(st\.config\), equalityFn\);/,
      /return useStoreSelector\(st => selector\(st\.runtime\), equalityFn\);/,
      /return useStoreSelector\(st => selector\(st\.mode\), equalityFn\);/,
    ],
    'hooks'
  );

  assertMatchesAll(
    assert,
    notesSelectionState,
    [
      /notes_overlay_editor_selection_runtime\.js/,
      /return getSelectionOffsetsForEditorRuntime\(doc, editor\);/,
      /restoreSelectionOffsetsForEditorRuntime\(doc, editor, offsets\);/,
      /return readToolbarSelectionStateRuntime\(doc, editor\);/,
    ],
    'notesSelectionState forwards selection helpers to the dedicated runtime seam'
  );

  assertMatchesAll(
    assert,
    notesSelectionRuntime,
    [
      /function readElementNode\(node: Node \| null \| undefined\): Element \| null \{/,
      /function readChildNodes\(node: Node \| null \| undefined\): Node\[] \{/,
      /function readRangeStartElement\(range: Range\): Element \| null \{/,
    ],
    'notesSelectionRuntime'
  );
  assertLacksAll(assert, notesSelectionRuntime, [/as Element/, /as Node\[]/], 'notesSelectionRuntime');

  assertMatchesAll(
    assert,
    notesOverlay,
    [
      /function readSavedNotesArray\(value: unknown\): unknown\[] \{/,
      /function readSavedNoteStyle\(note: SavedNote \| null \| undefined\): SavedNoteStyle \{/,
      /function ensureNotesRuntimeState\(notes: ReturnType<typeof ensureNotesNamespace>\): NotesRuntimeLike \{/,
      /function ensureNotesDrawState\(notes: ReturnType<typeof ensureNotesNamespace>\): NotesDrawLike \{/,
      /function readPointerEventTarget\(target: EventTarget \| null\): HTMLElement \| null \{/,
    ],
    'notesOverlay'
  );
});
