import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 69 render interior sketch external drawers ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_interior_sketch_drawers_external.ts');
  const apply = read('esm/native/builder/render_interior_sketch_drawers_external_apply.ts');
  const context = read('esm/native/builder/render_interior_sketch_drawers_external_context.ts');
  const plan = read('esm/native/builder/render_interior_sketch_drawers_external_plan.ts');
  const group = read('esm/native/builder/render_interior_sketch_drawers_external_group.ts');
  const visual = read('esm/native/builder/render_interior_sketch_drawers_external_visual.ts');
  const box = read('esm/native/builder/render_interior_sketch_drawers_external_box.ts');
  const motion = read('esm/native/builder/render_interior_sketch_drawers_external_motion.ts');
  const types = read('esm/native/builder/render_interior_sketch_drawers_external_types.ts');
  const drawerFacade = read('esm/native/builder/render_interior_sketch_drawers.ts');

  assert.ok(lineCount(facade) <= 2, 'external sketch drawers public module must stay a tiny facade');
  assert.match(facade, /render_interior_sketch_drawers_external_apply\.js/);
  assert.doesNotMatch(
    facade,
    /computeExternalDrawersOpsForModule|resolveBuilderMirrorMaterial|new THREE\.|createDoorVisual|drawersArray\.push/,
    'external sketch drawer facade must not own planning, materials, meshes, visual creation, or motion entries'
  );

  assert.match(apply, /export function applySketchExternalDrawers\(/);
  assert.match(apply, /createSketchExternalDrawerRenderContext\(args\)/);
  assert.match(apply, /createSketchExternalDrawerStackPlan\(context, context\.extDrawers\[i\], i\)/);
  assert.match(apply, /createSketchExternalDrawerOpPlan\(context, stack, stack\.drawerOps\[j\], j\)/);
  assert.match(apply, /createSketchExternalDrawerGroupNode\(context, stack, opPlan\)/);
  assert.match(apply, /addSketchExternalDrawerFrontVisual\(context, stack, opPlan, groupNode\)/);
  assert.match(apply, /addSketchExternalDrawerBoxAndConnector\(context, stack, opPlan, groupNode\)/);
  assert.match(apply, /registerSketchExternalDrawerMotionEntry\(context, opPlan, groupNode\)/);
  assert.doesNotMatch(
    apply,
    /new context\.THREE|computeExternalDrawersOpsForModule|resolveBuilderMirrorMaterial|createDoorVisual\(/
  );

  assert.match(context, /export function createSketchExternalDrawerRenderContext\(/);
  assert.match(context, /getDrawersArray\(App\)/);
  assert.match(context, /resolveBuilderMirrorMaterial\(/);
  assert.match(context, /const doorStyle = resolveSketchDoorStyle\(App, input\);/);
  assert.match(context, /const doorStyleMap = resolveSketchDoorStyleMap\(App, input\);/);
  assert.match(context, /const resolvePartMaterial = \(partId: string\): unknown => \{/);
  assert.doesNotMatch(
    context,
    /computeExternalDrawersOpsForModule|applySketchModulePickMeta|createDoorVisual\(/
  );

  assert.match(plan, /export function createSketchExternalDrawerStackPlan\(/);
  assert.match(plan, /computeExternalDrawersOpsForModule\(/);
  assert.match(plan, /resolveSketchExternalDrawerMetrics\(/);
  assert.match(plan, /const drawerFaceW = context\.moduleDoorFaceSpan\?\.spanW \?\? context\.outerW;/);
  assert.match(
    plan,
    /const drawerFaceOffsetX =\s*\(context\.moduleDoorFaceSpan\?\.centerX \?\? context\.internalCenterX\) - context\.internalCenterX;/
  );
  assert.match(
    plan,
    /applySketchExternalDrawerFaceOverrides\(drawerOps, drawerFaceW, drawerFaceOffsetX, context\.frontZ\);/
  );
  assert.match(plan, /export function createSketchExternalDrawerOpPlan\(/);
  assert.match(plan, /resolveSketchExternalDrawerFaceVerticalAlignment\(/);
  assert.doesNotMatch(plan, /new context\.THREE|applySketchModulePickMeta|createDoorVisual\(/);

  assert.match(group, /export function createSketchExternalDrawerGroupNode\(/);
  assert.match(group, /new context\.THREE\.Group\(\)/);
  assert.match(group, /groupUd\.moduleIndex = resolvedModuleIndex \|\| context\.moduleIndex;/);
  assert.match(group, /groupUd\.__wpStack = resolvedStackKey;/);
  assert.match(group, /groupUd\.__wpFaceMinY = opPlan\.faceMinY;/);
  assert.doesNotMatch(group, /createDoorVisual|BoxGeometry|drawersArray\.push/);

  assert.match(visual, /export function addSketchExternalDrawerFrontVisual\(/);
  assert.match(visual, /resolveSketchFrontVisualState\(context\.input, opPlan\.partId\)/);
  assert.match(visual, /resolveSketchExternalDrawerFrontMaterials\(/);
  assert.match(visual, /context\.resolveCachedMirrorMaterial\(\)/);
  assert.match(visual, /context\.input\.createDoorVisual\(/);
  assert.match(
    visual,
    /const effectiveFrameStyle = resolveEffectiveDoorStyle\(context\.doorStyle, context\.doorStyleMap, opPlan\.partId\);[\s\S]*frontVisualState\.isGlass \? 'glass' : effectiveFrameStyle[\s\S]*frontVisualState\.isGlass \? \{ glassFrameStyle: effectiveFrameStyle \} : null/
  );
  assert.match(visual, /new context\.THREE\.Mesh\(/);
  assert.match(visual, /applySketchModulePickMetaDeep\(visualObj, opPlan\.partId, context\.moduleKeyStr, \{/);
  assert.doesNotMatch(visual, /computeExternalDrawersOpsForModule|drawersArray\.push/);

  assert.match(box, /export function addSketchExternalDrawerBoxAndConnector\(/);
  assert.match(box, /context\.input\.createInternalDrawerBox\(/);
  assert.match(box, /new context\.THREE\.BoxGeometry\(opPlan\.boxW, opPlan\.boxH, opPlan\.boxD\)/);
  assert.match(
    box,
    /new context\.THREE\.BoxGeometry\(opPlan\.connectorW, opPlan\.connectorH, opPlan\.connectorD\)/
  );
  assert.match(box, /applySketchModulePickMetaDeep\(drawerBoxObj, opPlan\.partId, context\.moduleKeyStr, \{/);
  assert.match(box, /applySketchModulePickMeta\(connector, opPlan\.partId, context\.moduleKeyStr, \{/);
  assert.doesNotMatch(box, /createDoorVisual|computeExternalDrawersOpsForModule|drawersArray\.push/);

  assert.match(motion, /export function registerSketchExternalDrawerMotionEntry\(/);
  assert.match(motion, /createSketchDrawerMotionPoint\(context\.THREE, opPlan\.px, opPlan\.py, opPlan\.pz\)/);
  assert.match(motion, /context\.drawersArray\.push\(drawerEntry\);/);
  assert.doesNotMatch(motion, /new context\.THREE|createDoorVisual|computeExternalDrawersOpsForModule/);

  for (const exportedType of [
    'SketchExternalDrawerRenderContext',
    'SketchExternalDrawerStackPlan',
    'SketchExternalDrawerOpPlan',
    'SketchExternalDrawerGroupNode',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`));
  }
  assert.doesNotMatch(types, /export function |new context\.THREE|computeExternalDrawersOpsForModule/);

  assert.match(drawerFacade, /from '\.\/render_interior_sketch_drawers_external\.js';/);
  assert.doesNotMatch(
    drawerFacade,
    /render_interior_sketch_drawers_external_(apply|context|plan|group|visual|box|motion|types)\.js/,
    'sketch drawers aggregator must keep using the public external-drawer facade instead of private owners'
  );

  assert.doesNotMatch(
    facade + apply + context + plan + group + visual + box + motion + types,
    /export default\s+/
  );
});
