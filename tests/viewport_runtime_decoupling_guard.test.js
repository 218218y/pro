import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const notesBundleRaw = bundleSources(
  [
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
const notesBundle = bundleSources(
  [
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
  ],
  import.meta.url,
  { stripNoise: true }
);

test('notes and export consumers use viewport runtime helpers instead of direct control/scene poking', () => {
  assertLacksAll(assert, notesBundle, [/App\.render\.controls\.enabled/], 'notes viewport bundle');
  assertMatchesAll(assert, notesBundleRaw, [/setOrbitControlsEnabled\(/], 'notes viewport bundle');

  assertMatchesAll(assert, exportBundleRaw, [/applyViewportSketchMode\(/], 'export viewport bundle');
  assertLacksAll(
    assert,
    exportBundle,
    [/sceneView\.updateSceneMode/, /sceneView\.updateLights/],
    'export viewport bundle'
  );
});
