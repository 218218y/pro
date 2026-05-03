import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 67 render preview marker ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_preview_marker_ops.ts');
  const factory = read('esm/native/builder/render_preview_marker_ops_factory.ts');
  const types = read('esm/native/builder/render_preview_marker_ops_types.ts');
  const shared = read('esm/native/builder/render_preview_marker_ops_shared.ts');
  const materials = read('esm/native/builder/render_preview_marker_ops_materials.ts');
  const split = read('esm/native/builder/render_preview_marker_ops_split.ts');
  const doorAction = read('esm/native/builder/render_preview_marker_ops_door_action.ts');
  const doorCut = read('esm/native/builder/render_preview_marker_ops_door_cut.ts');
  const previewOwner = read('esm/native/builder/render_preview_ops.ts');

  assert.ok(lineCount(facade) <= 4, 'preview marker public module must stay a tiny facade');
  assert.match(facade, /render_preview_marker_ops_factory\.js/);
  assert.doesNotMatch(
    facade,
    /function ensureSplitHoverMarker|function ensureDoorActionHoverMarker|function ensureDoorCutHoverMarker|new THREE\./,
    'preview marker facade must not own marker creation, THREE material setup, or cache attachment behavior'
  );

  assert.match(factory, /export function createBuilderRenderPreviewMarkerOps\(/);
  assert.match(factory, /createRenderPreviewMarkerContext\(deps\)/);
  assert.match(factory, /createSplitHoverMarkerOwner\(ctx\)/);
  assert.match(factory, /createDoorActionHoverMarkerOwner\(ctx\)/);
  assert.match(factory, /createDoorCutHoverMarkerOwner\(ctx\)/);
  assert.doesNotMatch(factory, /new THREE\.|new THREE\.MeshBasicMaterial|__matAdd|__matTop|__matRemove/);

  for (const exportedType of [
    'PreviewMarkerArgs',
    'MarkerMaterialMap',
    'MarkerMeshLike',
    'MarkerTHREESurface',
    'RenderPreviewMarkerContext',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`));
  }
  assert.doesNotMatch(types, /export function |new THREE\./);

  for (const fn of [
    'createRenderPreviewMarkerContext',
    'markerArgsRecord',
    'asMarkerMesh',
    'ensureWardrobeAttachment',
    'ensureCachedMarker',
    'resolveMarkerTHREE',
  ]) {
    assert.match(shared, new RegExp(`export function ${fn}\\(`));
  }
  assert.match(shared, /marker\.userData\.__ignoreRaycast = true;/);
  assert.match(shared, /marker\.raycast = function \(\) \{\};/);
  assert.doesNotMatch(shared, /__matAdd|__matTop|new THREE\./);

  assert.match(materials, /export function createMarkerMaterial\(/);
  assert.match(materials, /new THREE\.MeshBasicMaterial\(/);
  assert.match(materials, /side: THREE\.DoubleSide/);
  assert.doesNotMatch(materials, /__matAdd|ensureCachedMarker|writeCacheValue/);

  assert.match(split, /export function createSplitHoverMarkerOwner\(/);
  assert.match(split, /function ensureSplitHoverMarker\(args: PreviewMarkerArgs\)/);
  assert.match(split, /ctx\.writeCacheValue\(App, 'splitHoverMarker', mesh\)/);
  assert.match(split, /mesh\.userData\.__matTop = matTop;/);
  assert.doesNotMatch(
    split,
    /function ensureDoorActionHoverMarker|function ensureDoorCutHoverMarker|__matGroove|__matRemove/
  );

  assert.match(doorAction, /export function createDoorActionHoverMarkerOwner\(/);
  assert.match(doorAction, /function ensureDoorActionHoverMarker\(args: PreviewMarkerArgs\)/);
  assert.match(doorAction, /ctx\.writeCacheValue\(App, 'doorActionHoverMarker', mesh\)/);
  assert.match(doorAction, /mesh\.userData\.__matAdd = addMat;/);
  assert.match(doorAction, /mesh\.userData\.__matMirror = mirrorMat;/);
  assert.match(doorAction, /mesh\.userData\.__matCenter = centerMat;/);
  assert.doesNotMatch(
    doorAction,
    /function ensureSplitHoverMarker|function ensureDoorCutHoverMarker|__matTop/
  );

  assert.match(doorCut, /export function createDoorCutHoverMarkerOwner\(/);
  assert.match(doorCut, /function ensureDoorCutHoverMarker\(args: PreviewMarkerArgs\)/);
  assert.match(doorCut, /ctx\.writeCacheValue\(App, 'doorCutHoverMarker', mesh\)/);
  assert.match(doorCut, /mesh\.userData\.__matAdd = addMat;/);
  assert.match(doorCut, /mesh\.userData\.__matRemove = removeMat;/);
  assert.doesNotMatch(
    doorCut,
    /function ensureSplitHoverMarker|function ensureDoorActionHoverMarker|__matGroove|__matCenter/
  );

  assert.match(previewOwner, /from '\.\/render_preview_marker_ops\.js';/);
  assert.doesNotMatch(
    previewOwner,
    /render_preview_marker_ops_(factory|types|shared|materials|split|door_action|door_cut)\.js/,
    'preview ops aggregator must keep using the public marker facade instead of private marker owners'
  );

  assert.doesNotMatch(
    facade + factory + types + shared + materials + split + doorAction + doorCut,
    /export default\s+/
  );
});
