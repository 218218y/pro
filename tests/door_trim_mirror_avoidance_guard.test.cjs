const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const semanticContracts = import('./_semantic_source_contracts.js');

function read(rel) {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}

function bundleDoorTrimFeature() {
  return [
    'esm/native/features/door_authoring/internal/trim.ts',
    'esm/native/features/door_authoring/internal/trim_shared.ts',
    'esm/native/features/door_authoring/internal/trim_map.ts',
    'esm/native/features/door_authoring/internal/trim_placement.ts',
    'esm/native/features/door_authoring/internal/trim_placement_contracts.ts',
    'esm/native/features/door_authoring/internal/trim_placement_geometry.ts',
    'esm/native/features/door_authoring/internal/trim_placement_mirror.ts',
    'esm/native/features/door_authoring/internal/trim_placement_match.ts',
  ]
    .map(read)
    .join('\n');
}

test('[door-trim] mirror sized layouts are used to keep trim previews and commits off the mirror face', async () => {
  const { getCallFacts } = await semanticContracts;
  const feature = bundleDoorTrimFeature();
  const hover = [
    'esm/native/services/canvas_picking_door_action_hover_flow.ts',
    'esm/native/services/canvas_picking_door_action_hover_marker.ts',
  ]
    .map(read)
    .join('\n');
  const hoverPreview = [
    'esm/native/services/canvas_picking_door_action_hover_preview_trim.ts',
    'esm/native/services/canvas_picking_door_action_hover_preview_shared.ts',
    'esm/native/services/canvas_picking_door_action_hover_preview_state.ts',
  ]
    .map(read)
    .join('\n');
  const edit = read('esm/native/services/canvas_picking_door_trim_click.ts');

  assert.match(feature, /resolveDoorTrimPlacementAvoidingMirror/);
  assert.match(feature, /readMirrorLayoutList\(mirrorLayouts\)/);
  const mirrorPlacementSource = read('esm/native/features/door_authoring/internal/trim_placement_mirror.ts');
  const mirrorPlacementCall = getCallFacts(
    mirrorPlacementSource,
    'resolveMirrorPlacementListInRect',
    'trim_placement_mirror.ts'
  )[0];
  assert.deepEqual(Object.keys(mirrorPlacementCall?.args[0]?.properties || {}).sort(), ['layouts', 'rect']);
  assert.match(feature, /DOOR_TRIM_MIRROR_SNAP_ZONE_M: number = DOOR_TRIM_SNAP_POLICY\.mirrorZoneM/);
  assert.match(feature, /DOOR_TRIM_MIRROR_EDGE_GAP_M: number = DOOR_TRIM_SNAP_POLICY\.mirrorEdgeGapM/);
  assert.match(feature, /if \(!overlapsAnyMirror\(baseRect, mirrorRects, snapZone\)\) return base;/);

  assert.match(hover, /tryHandleDoorTrimHoverPreview/);
  assert.match(hoverPreview, /const trimMirrorLayouts = readMirrorLayoutListForPart\(/);
  const hoverTrimSource = read('esm/native/services/canvas_picking_door_action_hover_preview_trim.ts');
  const hoverTrimCall = getCallFacts(
    hoverTrimSource,
    'resolveDoorTrimPlacementAvoidingMirror',
    'canvas_picking_door_action_hover_preview_trim.ts'
  )[0];
  assert.deepEqual(hoverTrimCall?.args[0]?.properties?.mirrorLayouts, {
    kind: 'identifier',
    name: 'trimMirrorLayouts',
  });

  assert.match(edit, /const trimMirrorLayouts = readMirrorLayoutListForPart\(/);
  const editTrimCall = getCallFacts(
    edit,
    'resolveDoorTrimPlacementAvoidingMirror',
    'canvas_picking_door_trim_click.ts'
  )[0];
  assert.deepEqual(editTrimCall?.args[0]?.properties?.mirrorLayouts, {
    kind: 'identifier',
    name: 'trimMirrorLayouts',
  });
  const adjustedCenterCall = getCallFacts(
    edit,
    'buildDoorTrimCenterFromLocal',
    'canvas_picking_door_trim_click.ts'
  )[0];
  assert.deepEqual(Object.keys(adjustedCenterCall?.args[0]?.properties || {}).sort(), [
    'localX',
    'localY',
    'rect',
  ]);
});
