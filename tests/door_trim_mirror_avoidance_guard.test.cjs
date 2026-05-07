const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}

function bundleDoorTrimFeature() {
  return [
    'esm/native/features/door_trim.ts',
    'esm/native/features/door_trim_shared.ts',
    'esm/native/features/door_trim_map.ts',
    'esm/native/features/door_trim_placement.ts',
    'esm/native/features/door_trim_placement_contracts.ts',
    'esm/native/features/door_trim_placement_geometry.ts',
    'esm/native/features/door_trim_placement_mirror.ts',
    'esm/native/features/door_trim_placement_match.ts',
  ]
    .map(read)
    .join('\n');
}

test('[door-trim] mirror sized layouts are used to keep trim previews and commits off the mirror face', () => {
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
  assert.match(feature, /resolveMirrorPlacementListInRect\(\{ rect, layouts \}\)/);
  assert.match(feature, /DOOR_TRIM_MIRROR_SNAP_ZONE_M: number = DOOR_TRIM_DIMENSIONS\.snap\.mirrorZoneM/);
  assert.match(feature, /DOOR_TRIM_MIRROR_EDGE_GAP_M: number = DOOR_TRIM_DIMENSIONS\.snap\.mirrorEdgeGapM/);
  assert.match(feature, /if \(!overlapsAnyMirror\(baseRect, mirrorRects, snapZone\)\) return base;/);

  assert.match(hover, /tryHandleDoorTrimHoverPreview/);
  assert.match(hoverPreview, /const trimMirrorLayouts = readMirrorLayoutListForPart\(/);
  assert.match(hoverPreview, /resolveDoorTrimPlacementAvoidingMirror\(\{/);
  assert.match(hoverPreview, /mirrorLayouts: trimMirrorLayouts/);

  assert.match(edit, /const trimMirrorLayouts = readMirrorLayoutListForPart\(/);
  assert.match(edit, /const placement = resolveDoorTrimPlacementAvoidingMirror\(\{/);
  assert.match(edit, /const adjustedCenter = buildDoorTrimCenterFromLocal\(\{/);
});
