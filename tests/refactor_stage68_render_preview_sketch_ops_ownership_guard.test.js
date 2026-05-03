import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 68 render preview sketch placement ops ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_preview_sketch_ops.ts');
  const factory = read('esm/native/builder/render_preview_sketch_ops_factory.ts');
  const context = read('esm/native/builder/render_preview_sketch_ops_context.ts');
  const state = read('esm/native/builder/render_preview_sketch_ops_state.ts');
  const materials = read('esm/native/builder/render_preview_sketch_ops_materials.ts');
  const meshes = read('esm/native/builder/render_preview_sketch_ops_meshes.ts');
  const apply = read('esm/native/builder/render_preview_sketch_ops_apply.ts');
  const types = read('esm/native/builder/render_preview_sketch_ops_types.ts');
  const previewOwner = read('esm/native/builder/render_preview_ops.ts');

  assert.ok(lineCount(facade) <= 3, 'sketch placement public module must stay a tiny facade');
  assert.match(facade, /render_preview_sketch_ops_factory\.js/);
  assert.doesNotMatch(
    facade,
    /createRenderPreviewSketchShared|applySketchPlacementPreview|hideSketchPlacementMeasurements|new THREE\./,
    'sketch placement facade must not own shared setup, pipeline application, measurement cleanup, or THREE construction'
  );

  assert.match(factory, /export function createBuilderRenderSketchPlacementPreviewOps\(/);
  assert.match(factory, /createRenderPreviewSketchOpsContext\(deps\)/);
  assert.match(factory, /ensureSketchPlacementPreviewOwner\(owner, args\)/);
  assert.match(factory, /hideSketchPlacementPreviewOwner\(owner, args\)/);
  assert.match(factory, /setSketchPlacementPreviewOwner\(owner, args\)/);
  assert.doesNotMatch(factory, /new THREE\.|applySketchPlacementPreview|createRenderPreviewSketchShared/);

  assert.match(context, /export function createRenderPreviewSketchOpsContext\(/);
  assert.match(context, /shared: createRenderPreviewSketchShared\(deps\)/);
  assert.doesNotMatch(context, /new THREE\.|applySketchPlacementPreview|sketchPlacementPreview/);

  assert.match(state, /export function ensureSketchPlacementPreviewOwner\(/);
  assert.match(state, /export function hideSketchPlacementPreviewOwner\(/);
  assert.match(state, /createSketchPlacementPreviewMaterials\(THREE, owner\.shared\)/);
  assert.match(state, /createSketchPlacementPreviewGroup\(\{ THREE, shared: owner\.shared, materials \}\)/);
  assert.match(state, /hideSketchPlacementMeasurements\(group, owner\.shared\)/);
  assert.match(state, /owner\.writeCacheValue\(App, 'sketchPlacementPreview', nextGroup\)/);
  assert.doesNotMatch(state, /new THREE\.|applySketchPlacementPreview\(/);

  assert.match(materials, /export function createSketchPlacementPreviewMaterials\(/);
  assert.match(materials, /new THREE\.MeshBasicMaterial\(/);
  assert.match(materials, /new THREE\.LineBasicMaterial\(/);
  assert.match(materials, /matBoxOverlay: createSketchMeshMaterial\(THREE, shared, 0xfbbf24, 0\.3, false\)/);
  assert.match(materials, /lineRemoveOverlay: createSketchLineMaterial\(THREE, shared, 0xff4d4f, 1, false\)/);
  assert.doesNotMatch(materials, /sketchPlacementPreview|wardrobeGroup|applySketchPlacementPreview/);

  assert.match(meshes, /export function createSketchPlacementPreviewGroup\(/);
  assert.match(meshes, /export function readSketchPlacementPreviewMeshSlots\(/);
  assert.match(meshes, /new THREE\.BoxGeometry\(1, 1, 1\)/);
  assert.match(meshes, /new THREE\.EdgesGeometry\(unitGeo\)/);
  assert.match(meshes, /new THREE\.Mesh\(unitGeo, material\)/);
  assert.match(meshes, /new THREE\.LineSegments\(unitEdgesGeo, lineMaterial\)/);
  assert.match(meshes, /new THREE\.Group\(\)/);
  assert.match(meshes, /userData\.__shelfA = shelfA;/);
  assert.match(meshes, /userData\.__lineRemoveOverlay = materials\.lineRemoveOverlay;/);
  assert.doesNotMatch(meshes, /assertTHREE|wardrobeGroup|applySketchPlacementPreview/);

  assert.match(apply, /export function setSketchPlacementPreviewOwner\(/);
  assert.match(apply, /ensureSketchPlacementPreviewOwner\(owner, \{ App, THREE: initialTHREE \}\)/);
  assert.match(apply, /attachSketchPlacementPreviewToDesiredParent\(owner, App, input, group\)/);
  assert.match(apply, /readSketchPlacementPreviewMeshSlots\(group, owner\.shared\)/);
  assert.match(apply, /applySketchPlacementPreview\(\{/);
  assert.doesNotMatch(
    apply,
    /new THREE\.|MeshBasicMaterial|LineBasicMaterial|hideSketchPlacementMeasurements/
  );

  for (const exportedType of [
    'RenderPreviewSketchOpsContext',
    'SketchPlacementPreviewMaterialSet',
    'SketchPlacementPreviewMeshSlots',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`));
  }
  assert.doesNotMatch(types, /export function |new THREE\./);

  assert.match(previewOwner, /from '\.\/render_preview_sketch_ops\.js';/);
  assert.doesNotMatch(
    previewOwner,
    /render_preview_sketch_ops_(factory|context|state|materials|meshes|apply|types)\.js/,
    'render preview aggregator must keep using the public sketch placement facade instead of private owners'
  );

  assert.doesNotMatch(
    facade + factory + context + state + materials + meshes + apply + types,
    /export default\s+/
  );
});
