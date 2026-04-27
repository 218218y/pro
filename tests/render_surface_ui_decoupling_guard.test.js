import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const uiBoot = readSource('../esm/native/ui/boot_main.ts', import.meta.url);
const uiBootController = bundleSources(
  ['../esm/native/ui/ui_boot_controller_runtime.ts', '../esm/native/ui/ui_boot_controller_viewport.ts'],
  import.meta.url,
  { stripNoise: true }
);
const exportBundleRaw = bundleSources(
  [
    '../esm/native/ui/export_canvas.ts',
    '../esm/native/ui/export/export_canvas_shared.ts',
    '../esm/native/ui/export/export_canvas_core.ts',
    '../esm/native/ui/export/export_canvas_core_shared.ts',
    '../esm/native/ui/export/export_canvas_core_canvas.ts',
    '../esm/native/ui/export/export_canvas_core_feedback.ts',
    '../esm/native/ui/export/export_canvas_scene.ts',
    '../esm/native/ui/export/export_canvas_viewport.ts',
    '../esm/native/ui/export/export_canvas_viewport_shared.ts',
    '../esm/native/ui/export/export_canvas_viewport_camera.ts',
    '../esm/native/ui/export/export_canvas_viewport_refs.ts',
    '../esm/native/ui/export/export_canvas_delivery.ts',
    '../esm/native/ui/export/export_canvas_delivery_shared.ts',
    '../esm/native/ui/export/export_canvas_delivery_logo.ts',
    '../esm/native/ui/export/export_canvas_delivery_download.ts',
    '../esm/native/ui/export/export_canvas_delivery_clipboard.ts',
    '../esm/native/ui/export/export_canvas_workflows.ts',
    '../esm/native/ui/export/export_canvas_workflow_shared.ts',
    '../esm/native/ui/export/export_canvas_workflow_contracts.ts',
    '../esm/native/ui/export/export_canvas_workflow_header.ts',
    '../esm/native/ui/export/export_canvas_workflow_front_notes.ts',
    '../esm/native/ui/export/export_canvas_workflow_copy.ts',
    '../esm/native/ui/export/export_canvas_workflow_dual.ts',
    '../esm/native/ui/export/export_canvas_workflow_render_sketch.ts',
    '../esm/native/ui/export/export_canvas_workflow_snapshot.ts',
    '../esm/native/ui/react/notes/NotesOverlay.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_style.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_services.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_note_card_preview.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_toolbar.tsx',
  ],
  import.meta.url
);
const exportBundle = bundleSources(
  [
    '../esm/native/ui/export_canvas.ts',
    '../esm/native/ui/export/export_canvas_shared.ts',
    '../esm/native/ui/export/export_canvas_core.ts',
    '../esm/native/ui/export/export_canvas_core_shared.ts',
    '../esm/native/ui/export/export_canvas_core_canvas.ts',
    '../esm/native/ui/export/export_canvas_core_feedback.ts',
    '../esm/native/ui/export/export_canvas_scene.ts',
    '../esm/native/ui/export/export_canvas_viewport.ts',
    '../esm/native/ui/export/export_canvas_viewport_shared.ts',
    '../esm/native/ui/export/export_canvas_viewport_camera.ts',
    '../esm/native/ui/export/export_canvas_viewport_refs.ts',
    '../esm/native/ui/export/export_canvas_delivery.ts',
    '../esm/native/ui/export/export_canvas_delivery_shared.ts',
    '../esm/native/ui/export/export_canvas_delivery_logo.ts',
    '../esm/native/ui/export/export_canvas_delivery_download.ts',
    '../esm/native/ui/export/export_canvas_delivery_clipboard.ts',
    '../esm/native/ui/export/export_canvas_workflows.ts',
    '../esm/native/ui/export/export_canvas_workflow_shared.ts',
    '../esm/native/ui/export/export_canvas_workflow_contracts.ts',
    '../esm/native/ui/export/export_canvas_workflow_header.ts',
    '../esm/native/ui/export/export_canvas_workflow_front_notes.ts',
    '../esm/native/ui/export/export_canvas_workflow_copy.ts',
    '../esm/native/ui/export/export_canvas_workflow_dual.ts',
    '../esm/native/ui/export/export_canvas_workflow_render_sketch.ts',
    '../esm/native/ui/export/export_canvas_workflow_snapshot.ts',
    '../esm/native/ui/react/notes/NotesOverlay.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers.tsx',
    '../esm/native/ui/react/notes/notes_overlay_helpers_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_style.ts',
    '../esm/native/ui/react/notes/notes_overlay_helpers_services.ts',
    '../esm/native/ui/react/notes/notes_overlay_editor.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_shared.ts',
    '../esm/native/ui/react/notes/notes_overlay_note_card_preview.tsx',
    '../esm/native/ui/react/notes/notes_overlay_note_card_toolbar.tsx',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('UI boot no longer wires App.render directly', () => {
  assertLacksAll(
    assert,
    uiBoot + '\n' + uiBootController,
    [/App\.render\.scene =/, /App\.render\.camera =/, /App\.render\.renderer =/, /App\.render\.controls =/],
    'ui boot'
  );
  assertMatchesAll(
    assert,
    uiBoot,
    [/ui_boot_controller_runtime\.js/, /ensureUiBootViewportContext\(/],
    'ui boot orchestration'
  );
  assertMatchesAll(assert, uiBootController, [/createViewportSurface\(/], 'ui boot controller family');
});

test('UI/export/notes consumers use viewport seams instead of raw render and direct sketch writes', () => {
  assertLacksAll(
    assert,
    exportBundle,
    [
      /App\.render \? App\.render/,
      /setRuntimeScalar\(App, 'sketchMode'/,
      /sceneView\.updateSceneMode/,
      /sceneView\.updateLights/,
    ],
    'export+notes bundle'
  );
  assertMatchesAll(
    assert,
    exportBundleRaw,
    [
      /getViewportRenderCore\(/,
      /restoreViewportCameraPose\(/,
      /scaleViewportCameraDistance\(/,
      /applyViewportSketchMode\(/,
      /setOrbitControlsEnabled\(/,
    ],
    'export+notes bundle'
  );
});

test('NotesOverlay freezes saved-notes selector during edit mode instead of equality-hack masking', () => {
  const notesOwner = readSource('../esm/native/ui/react/notes/NotesOverlay.tsx', import.meta.url);
  assert.match(notesOwner, /const frozenSavedNotesRef = useRef<unknown\[]>\(\[\]\);/);
  assert.match(notesOwner, /if \(editMode\) return frozenSavedNotesRef\.current;/);
  assert.doesNotMatch(notesOwner, /editMode \? true : Object\.is/);
});
