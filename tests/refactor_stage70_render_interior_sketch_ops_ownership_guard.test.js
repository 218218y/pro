import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 70 render interior sketch ops ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_interior_sketch_ops.ts');
  const factory = read('esm/native/builder/render_interior_sketch_ops_factory.ts');
  const context = read('esm/native/builder/render_interior_sketch_ops_context.ts');
  const input = read('esm/native/builder/render_interior_sketch_ops_input.ts');
  const dimensions = read('esm/native/builder/render_interior_sketch_ops_dimensions.ts');
  const placement = read('esm/native/builder/render_interior_sketch_ops_placement.ts');
  const boxes = read('esm/native/builder/render_interior_sketch_ops_boxes.ts');
  const extras = read('esm/native/builder/render_interior_sketch_ops_extras.ts');
  const apply = read('esm/native/builder/render_interior_sketch_ops_apply.ts');
  const types = read('esm/native/builder/render_interior_sketch_ops_types.ts');
  const renderOwner = read('esm/native/builder/render_ops.ts');

  assert.ok(lineCount(facade) <= 2, 'interior sketch ops public module must stay a tiny facade');
  assert.match(facade, /render_interior_sketch_ops_factory\.js/);
  assert.doesNotMatch(
    facade,
    /renderInteriorSketchBoxes|resolveSketchModuleInnerFaces|createInteriorSketchPlacementSupport|applySketchExternalDrawers|assertTHREE/,
    'interior sketch facade must not own input resolution, placement support, box rendering, drawer routing, or THREE lookup'
  );

  assert.match(factory, /export function createBuilderRenderInteriorSketchOps\(/);
  assert.match(factory, /createBuilderRenderInteriorSketchOpsContext\(deps\)/);
  assert.match(factory, /applyInteriorSketchExtrasOwner\(owner, args\)/);
  assert.doesNotMatch(
    factory,
    /renderInteriorSketchBoxes|resolveSketchModuleInnerFaces|createInteriorSketchPlacementSupport/
  );

  assert.match(context, /export function createBuilderRenderInteriorSketchOpsContext\(/);
  assert.match(context, /createMeasureWardrobeLocalBox\(/);
  assert.match(context, /markSplitHoverPickablesDirty:/);
  assert.match(context, /measureWardrobeLocalBox,/);
  assert.doesNotMatch(
    context,
    /renderInteriorSketchBoxes|applySketchExternalDrawers|resolveSketchModuleInnerFaces/
  );

  assert.match(input, /export function resolveInteriorSketchExtrasInput\(/);
  assert.match(input, /asRecordArray<SketchShelfExtra>\(extra\.shelves\)/);
  assert.match(input, /resolveSketchModuleInnerFaces\(/);
  assert.match(input, /resolveSketchModuleDoorFaceSpan\(/);
  assert.match(input, /readSketchDoorVisualFactory\(input\.createDoorVisual\)/);
  assert.match(input, /const braceShelfWidth = braceInnerW > 0/);
  assert.doesNotMatch(
    input,
    /renderInteriorSketchBoxes|createInteriorSketchPlacementSupport|applySketchExternalDrawers/
  );

  assert.match(dimensions, /export function resolveInteriorSketchThreeAndDimensions\(/);
  assert.match(dimensions, /asDimensionLineFn\(resolved\.renderOps\?\.addDimensionLine\)/);
  assert.match(
    dimensions,
    /owner\.assertTHREE\(resolved\.App, 'native\/builder\/render_ops\.applyInteriorSketchExtras'\)/
  );
  assert.match(dimensions, /export function renderInteriorSketchPendingFreeBoxDimensions\(/);
  assert.match(dimensions, /renderSketchFreeBoxDimensionOverlays\(/);
  assert.doesNotMatch(dimensions, /renderInteriorSketchBoxes|applySketchShelves|applySketchExternalDrawers/);

  assert.match(placement, /export function createInteriorSketchExtrasPlacementPlan\(/);
  assert.match(placement, /createInteriorSketchPlacementSupport\(/);
  assert.match(placement, /matCache: owner\.matCache/);
  assert.match(placement, /faces: resolved\.faces/);
  assert.doesNotMatch(
    placement,
    /renderInteriorSketchBoxes|applySketchStorageBarriers|applySketchExternalDrawers/
  );

  assert.match(boxes, /export function renderInteriorSketchOwnedBoxes\(/);
  assert.match(boxes, /renderInteriorSketchBoxes\(/);
  assert.match(boxes, /measureWardrobeLocalBox: owner\.measureWardrobeLocalBox/);
  assert.match(boxes, /doorsArray: owner\.doors\(resolved\.App\)/);
  assert.match(boxes, /markSplitHoverPickablesDirty: owner\.markSplitHoverPickablesDirty \?\? undefined/);
  assert.doesNotMatch(boxes, /applySketchShelves|applySketchExternalDrawers|resolveSketchModuleInnerFaces/);

  assert.match(extras, /export function applyInteriorSketchOwnedStorageBarriers\(/);
  assert.match(extras, /applySketchStorageBarriers\(/);
  assert.match(extras, /export function applyInteriorSketchOwnedShelves\(/);
  assert.match(extras, /createSketchBoxLocator\(boxAbs\)/);
  assert.match(extras, /applySketchShelves\(/);
  assert.match(extras, /export function applyInteriorSketchOwnedRods\(/);
  assert.match(extras, /applySketchRods\(/);
  assert.match(extras, /export function applyInteriorSketchOwnedDrawers\(/);
  assert.match(extras, /applySketchExternalDrawers\(/);
  assert.match(extras, /applySketchInternalDrawers\(/);
  assert.doesNotMatch(
    extras,
    /renderInteriorSketchBoxes|resolveSketchModuleInnerFaces|createInteriorSketchPlacementSupport/
  );

  assert.match(apply, /export function applyInteriorSketchExtrasOwner\(/);
  assert.match(apply, /resolveInteriorSketchExtrasInput\(owner, args\)/);
  assert.match(apply, /resolveInteriorSketchThreeAndDimensions\(owner, resolved\)/);
  assert.match(apply, /createInteriorSketchExtrasPlacementPlan\(owner, resolved, resolvedThree\)/);
  assert.match(
    apply,
    /renderInteriorSketchOwnedBoxes\(\{ owner, resolved, resolvedThree, placementPlan \}\)/
  );
  assert.match(apply, /applyInteriorSketchOwnedStorageBarriers\(resolved, owner\)/);
  assert.match(apply, /renderInteriorSketchPendingFreeBoxDimensions\(resolvedThree\)/);
  assert.match(apply, /applyInteriorSketchOwnedDrawers\(\{ owner, resolved, resolvedThree \}\)/);
  assert.doesNotMatch(
    apply,
    /renderInteriorSketchBoxes\(|resolveSketchModuleInnerFaces|createInteriorSketchPlacementSupport|assertTHREE\(/
  );

  for (const exportedType of [
    'RenderInteriorSketchOpsContext',
    'InteriorSketchExtrasInput',
    'InteriorSketchResolvedThree',
    'InteriorSketchPlacementPlan',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`));
  }
  assert.doesNotMatch(types, /export function |renderInteriorSketchBoxes|applySketchExternalDrawers/);

  assert.match(renderOwner, /from '\.\/render_interior_sketch_ops\.js';/);
  assert.doesNotMatch(
    renderOwner,
    /render_interior_sketch_ops_(factory|context|input|dimensions|placement|boxes|extras|apply|types)\.js/,
    'render interior aggregator must keep using the public sketch ops facade instead of private owners'
  );

  assert.doesNotMatch(
    facade + factory + context + input + dimensions + placement + boxes + extras + apply + types,
    /export default\s+/
  );
});
