import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

function normalizeWhitespace(input) {
  return String(input).replace(/\s+/g, ' ').trim();
}

test('[mirror-layout-family] canonical seam keeps split contracts/geometry/lookup owners with face/scoped consumers', () => {
  const mirrorLayout = read('esm/native/features/mirror_layout.ts');
  const contracts = read('esm/native/features/mirror_layout_contracts.ts');
  const sharedContracts = read('esm/shared/mirror_layout_contracts_shared.ts');
  const geometry = read('esm/native/features/mirror_layout_geometry.ts');
  const lookup = read('esm/native/features/mirror_layout_lookup.ts');
  const mirrorLayoutNorm = normalizeWhitespace(mirrorLayout);
  const contractsNorm = normalizeWhitespace(contracts);
  const sharedContractsNorm = normalizeWhitespace(sharedContracts);
  const geometryNorm = normalizeWhitespace(geometry);
  const lookupNorm = normalizeWhitespace(lookup);

  const visuals = [
    read('esm/native/builder/visuals_and_contents.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual.ts'),
    read('esm/native/builder/visuals_and_contents_door_visual_mirror.ts'),
  ].join('\n');
  const visualsNorm = normalizeWhitespace(visuals);
  const paintFlow = [
    read('esm/native/services/canvas_picking_paint_flow_apply.ts'),
    read('esm/native/services/canvas_picking_paint_flow_apply_special.ts'),
    read('esm/native/services/canvas_picking_paint_flow_mirror.ts'),
  ].join('\n');
  const hoverModes = [
    read('esm/native/services/canvas_picking_door_action_hover_flow.ts'),
    read('esm/native/services/canvas_picking_door_action_hover_marker.ts'),
  ].join('\n');
  const doorActionPreview = [
    'esm/native/services/canvas_picking_door_action_hover_preview_paint.ts',
    'esm/native/services/canvas_picking_door_action_hover_preview_shared.ts',
    'esm/native/services/canvas_picking_door_action_hover_preview_state.ts',
  ]
    .map(read)
    .join('\n');
  const wing = [
    'esm/native/builder/corner_wing_cell_interiors_runtime.ts',
    'esm/native/builder/corner_wing_cell_doors_rendering.ts',
  ]
    .map(read)
    .join('\n');
  const connector = read('esm/native/builder/corner_connector_door_emit_visuals.ts');

  assert.match(mirrorLayoutNorm, /from '\.\/mirror_layout_contracts\.js';/);
  assert.match(mirrorLayoutNorm, /from '\.\/mirror_layout_geometry\.js';/);
  assert.match(mirrorLayoutNorm, /from '\.\/mirror_layout_lookup\.js';/);

  assert.match(contractsNorm, /export \* from '\.\.\/\.\.\/shared\/mirror_layout_contracts_shared\.js';/);
  assert.match(sharedContractsNorm, /export function readMirrorLayoutEntry\(/);
  assert.match(sharedContractsNorm, /export function readMirrorLayoutList\(/);
  assert.match(sharedContractsNorm, /export function readMirrorLayoutMap\(/);
  assert.match(sharedContractsNorm, /export function mirrorLayoutListEquals\(/);

  assert.match(
    geometryNorm,
    /export type PreparedMirrorRect = \{ rect: MirrorRect; width: number; height: number; \};/
  );
  assert.match(geometryNorm, /export function prepareMirrorRect\(rect: MirrorRect\): PreparedMirrorRect \{/);
  assert.match(geometryNorm, /export function buildSnappedMirrorCenterFromPreparedRect\(/);
  assert.match(geometryNorm, /export function resolveMirrorPlacementFromPreparedRect\(/);
  assert.match(geometryNorm, /const preparedRect = prepareMirrorRect\(args\.rect\);/);
  assert.match(
    geometryNorm,
    /out\[i\] = resolveMirrorPlacementFromPreparedRect\(\{ preparedRect, layout: layouts\[i\] \}\);/
  );
  assert.match(
    geometryNorm,
    /if \(placement\.faceSign !== DEFAULT_FACE_SIGN\) out\.faceSign = placement\.faceSign;/
  );

  assert.match(lookupNorm, /export function readMirrorLayoutListForPart\(/);
  assert.match(lookupNorm, /export function findMirrorLayoutMatchInRect\(/);
  assert.match(
    lookupNorm,
    /const requestedFaceSign = args\.faceSign == null \? null : normalizeMirrorFaceSign\(args\.faceSign, DEFAULT_FACE_SIGN\);/
  );
  assert.match(
    lookupNorm,
    /const placement = resolveMirrorPlacementFromPreparedRect\(\{ preparedRect, layout \}\);/
  );

  assert.match(visualsNorm, /const placementFaceSign = readMirrorLayoutFaceSign\(placementLayout, zSign\);/);
  assert.match(
    visualsNorm,
    /mirrorMesh\.position\.set\([\s\S]*placement\.offsetX,[\s\S]*placement\.offsetY,[\s\S]*depthLayout\.mirrorCenterZ \* placementFaceSign[\s\S]*\);/
  );
  assert.match(paintFlow, /buildMirrorLayoutFromHit\([\s\S]*faceSign,[\s\S]*\)/);
  assert.match(paintFlow, /findMirrorLayoutMatchInRect\([\s\S]*faceSign,[\s\S]*\)/);
  assert.match(hoverModes, /tryHandleDoorPaintHoverPreview/);
  assert.match(doorActionPreview, /const hitFaceSign = __resolveMirrorFaceSignFromLocalPoint\(localHit\);/);
  assert.match(doorActionPreview, /zOff = 0\.02 \* \(placement\.faceSign === -1 \? -1 : 1\);/);

  const wingNorm = normalizeWhitespace(wing);
  const connectorNorm = normalizeWhitespace(connector);
  assert.match(wing, /readMirrorLayoutListForPart\(/);
  assert.match(
    wingNorm,
    /const scopedPartId = __stackKey === 'bottom' \? __stackScopePartKey\(partId\) : partId;/
  );
  assert.match(
    wingNorm,
    /preferScopedOnly: __stackSplitEnabled && __stackKey === 'bottom' && scopedPartId !== partId,/
  );
  assert.match(connector, /readMirrorLayoutListForPart\(/);
  assert.match(
    connectorNorm,
    /const scopedPartId = ctx\.stackKey === 'bottom' \? ctx\.stackScopePartKey\(partId\) : partId;/
  );
  assert.match(
    connectorNorm,
    /preferScopedOnly: ctx\.stackSplitEnabled && ctx\.stackKey === 'bottom' && scopedPartId !== partId,/
  );
});
