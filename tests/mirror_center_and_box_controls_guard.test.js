import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources, readSource } from './_source_bundle.js';

const interiorSketchBundle = bundleSources(
  [
    '../esm/native/ui/react/tabs/interior_tab_sections.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_controls.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_sections.tsx',
    '../esm/native/ui/react/tabs/interior_layout_door_trim_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_drawers_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_shelves_section.tsx',
    '../esm/native/ui/react/tabs/interior_layout_sketch_section_types.ts',
  ],
  import.meta.url
);

function read(rel) {
  return readSource(`../${rel}`, import.meta.url);
}

const previewSketchBundle = bundleSources(
  [
    '../esm/native/builder/render_preview_sketch_pipeline.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_shared.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_linear.ts',
  ],
  import.meta.url
);

test('[mirror-center] mirror by-size hover uses shared center snap and full-axis guides', () => {
  const feature = [
    read('esm/native/features/mirror_layout.ts'),
    read('esm/native/features/mirror_layout_contracts.ts'),
    read('esm/native/features/mirror_layout_geometry.ts'),
  ].join('\n');
  const hover = [
    'esm/native/services/canvas_picking_door_action_hover_preview_paint.ts',
    'esm/native/services/canvas_picking_door_action_hover_preview_shared.ts',
    'esm/native/services/canvas_picking_door_action_hover_preview_state.ts',
    'esm/native/services/canvas_picking_door_action_hover_preview_materials.ts',
  ]
    .map(read)
    .join('\n');
  const preview = previewSketchBundle;

  assert.match(feature, /MIRROR_CENTER_SNAP_NORM_THRESHOLD(?:\s*=\s*0\.04)?/);
  assert.match(feature, /buildSnappedMirrorCenterFromHit/);
  assert.match(
    feature,
    /const snappedX = Math\.abs\(rawCenterXNorm - DEFAULT_CENTER_NORM\) <= thresholdNorm/
  );
  assert.match(
    feature,
    /const snappedY = Math\.abs\(rawCenterYNorm - DEFAULT_CENTER_NORM\) <= thresholdNorm/
  );
  assert.match(hover, /buildSnappedMirrorCenterFromHit\(/);
  assert.match(hover, /showPrimaryBody: false/);
  assert.match(hover, /const hasSizedDraft = __hasMirrorSizedDraft\(readUi, App\);/);
  assert.match(
    hover,
    /const showGuidePreview = !removeMatch && hasSizedDraft && \(center\.snappedX \|\| center\.snappedY\);/
  );
  assert.match(hover, /showCenterXGuide: showGuidePreview && !!center\.snappedX/);
  assert.match(hover, /showCenterYGuide: showGuidePreview && !!center\.snappedY/);
  assert.match(
    hover,
    /if \(setSketchPreview && \(showGuidePreview \|\| clearanceMeasurements\.length\)\) \{/
  );
  assert.match(hover, /__styleMirrorGuidePreview\(guidePreview, \{ isCentered: !!center\.isCentered \}\)/);
  assert.match(preview, /const showPrimaryBody = ctx\.input\.showPrimaryBody !== false;/);
});

test('[box-controls] box advanced controls stay collapsed until box mode is active', () => {
  const helpers = [
    read('esm/native/ui/react/tabs/interior_tab_helpers.tsx'),
    read('esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts'),
  ].join('\n');
  assert.match(interiorSketchBundle, /const isSketchBoxControlsOpen =/);
  assert.match(
    interiorSketchBundle,
    /const isSketchBoxToolActive = props\.isSketchToolActive && isSketchBoxTool\(props\.manualToolRaw\);/
  );
  assert.match(helpers, /export function isSketchBoxTool\(tool: string\): boolean \{/);
  assert.match(helpers, /tool\.startsWith\(SKETCH_TOOL_BOX_PREFIX\)/);
  assert.match(helpers, /tool === SKETCH_TOOL_BOX_DIVIDER/);
  assert.match(helpers, /tool === SKETCH_TOOL_BOX_DOOR_HINGE/);
  assert.match(interiorSketchBundle, /\{isSketchBoxControlsOpen && \(/);
});
